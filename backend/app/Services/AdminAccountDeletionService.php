<?php

namespace App\Services;

use App\Models\AdminActivityLog;
use App\Models\Event;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

/**
 * Soft deletes student and security staff accounts (ADR 015). The row, its name, email and student number
 * stay for history; sign-in, tokens and password reset stop working. Repeating a delete changes nothing.
 */
class AdminAccountDeletionService
{
    public const STUDENT_TICKET_REVOCATION_REASON = 'Student account deleted by an administrator.';

    public function __construct(private readonly AdminEventTicketRevocationService $ticketRevocation) {}

    public function deleteSecurityStaff(User $staff, User $actor): void
    {
        DB::transaction(function () use ($staff, $actor): void {
            $locked = $this->lockAccount($staff, User::ROLE_SECURITY_STAFF);

            if ($locked->trashed()) {
                return;
            }

            $this->closeAccount($locked);
            $this->record($actor, AdminActivityLog::ACTION_SECURITY_STAFF_DELETED, 'security_staff', $locked, $locked->name.' · '.$locked->email);
        }, 3);
    }

    public function deleteStudent(User $student, User $actor): void
    {
        DB::transaction(function () use ($student, $actor): void {
            // Lock the events first and the student second, the same order ticket issuance uses.
            $this->lockEvents($this->activeTickets($student));
            $locked = $this->lockAccount($student, User::ROLE_STUDENT);

            if ($locked->trashed()) {
                return;
            }

            // The account is locked now, so no new ticket can be issued to it; this list is final.
            $tickets = $this->activeTickets($locked);
            $this->closeAccount($locked);

            foreach ($tickets as $ticket) {
                $this->ticketRevocation->revoke(
                    Event::query()->findOrFail($ticket->eventGate->event_id),
                    $ticket->getKey(),
                    self::STUDENT_TICKET_REVOCATION_REASON,
                    $actor,
                );
            }

            $this->record($actor, AdminActivityLog::ACTION_STUDENT_DELETED, 'student', $locked, $locked->student_number.' · '.$locked->name);
        }, 3);
    }

    private function lockAccount(User $account, string $role): User
    {
        $locked = User::withTrashed()
            ->where('role', $role)
            ->lockForUpdate()
            ->find($account->getKey());

        if (! $locked instanceof User) {
            throw (new ModelNotFoundException)->setModel(User::class, [$account->getKey()]);
        }

        return $locked;
    }

    /** Ends sign-in and API access, then hides the account. */
    private function closeAccount(User $account): void
    {
        $account->tokens()->delete();
        // A reset token issued before the delete must not work on a new account that reuses the email.
        DB::table('password_reset_tokens')->where('email', $account->email)->delete();
        $account->delete();
    }

    /** @return Collection<int, Ticket> */
    private function activeTickets(User $student): Collection
    {
        return Ticket::query()
            ->where('user_id', $student->getKey())
            ->whereIn('status', [Ticket::STATUS_ISSUED, Ticket::STATUS_CLAIMED])
            ->with('eventGate:id,event_id')
            ->orderBy('id')
            ->get();
    }

    /** @param Collection<int, Ticket> $tickets */
    private function lockEvents(Collection $tickets): void
    {
        $eventIds = $tickets->map(static fn (Ticket $ticket): int => (int) $ticket->eventGate->event_id)->unique()->sort()->values();

        if ($eventIds->isNotEmpty()) {
            Event::query()->whereIn('id', $eventIds)->orderBy('id')->lockForUpdate()->get();
        }
    }

    private function record(User $actor, string $action, string $subjectType, User $subject, string $label): void
    {
        AdminActivityLog::query()->create([
            'actor_user_id' => $actor->getKey(),
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subject->getKey(),
            'subject_label' => $label,
            'created_at' => now(),
        ]);
    }
}
