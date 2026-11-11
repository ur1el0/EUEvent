<?php

namespace App\Services;

use App\Models\AdminActivityLog;
use App\Models\PendingRegistration;
use App\Models\User;
use App\Notifications\MobileRegistrationCodeNotification;
use App\Support\MailFailureLog;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Throwable;

/**
 * Self-registration with an emailed one-time code (ADR 016). No users row exists until the code is verified.
 * Callers return the same generic response whether or not an account already exists, so none of these
 * methods tell the caller which case happened.
 */
class StudentRegistrationService
{
    /** @param array{student_number: string, name: string, email: string, password: string} $data */
    public function register(array $data): void
    {
        $email = mb_strtolower(trim($data['email']));
        $studentNumber = mb_strtoupper(trim($data['student_number']));

        if ($this->accountExists($email, $studentNumber)) {
            return;
        }

        $code = null;
        try {
            $code = DB::transaction(function () use ($data, $email, $studentNumber): ?string {
                $existing = PendingRegistration::query()->where('email', $email)->lockForUpdate()->first();

                if ($existing instanceof PendingRegistration && ! $existing->isExpired() && ! $this->cooldownElapsed($existing)) {
                    return null;
                }

                $existing?->delete();
                $code = $this->newCode();

                PendingRegistration::query()->create([
                    'email' => $email,
                    'student_number' => $studentNumber,
                    'name' => trim($data['name']),
                    'password' => Hash::make($data['password']),
                    'code_hash' => $this->hashCode($email, $code),
                    'expires_at' => now()->addMinutes($this->lifetimeMinutes()),
                    'attempts' => 0,
                    'last_sent_at' => now(),
                ]);

                return $code;
            });
        } catch (UniqueConstraintViolationException) {
            // A simultaneous request for the same email won; its code is the one that was sent.
            return;
        }

        if ($code !== null) {
            $this->sendCode($email, trim($data['name']), $code);
        }
    }

    public function resend(string $email): void
    {
        $email = mb_strtolower(trim($email));

        $sent = DB::transaction(function () use ($email): ?array {
            $pending = PendingRegistration::query()->where('email', $email)->lockForUpdate()->first();

            if (! $pending instanceof PendingRegistration) {
                return null;
            }

            if ($pending->isExpired()) {
                $pending->delete();

                return null;
            }

            if (! $this->cooldownElapsed($pending)) {
                return null;
            }

            $code = $this->newCode();
            $pending->forceFill([
                'code_hash' => $this->hashCode($email, $code),
                'attempts' => 0,
                'expires_at' => now()->addMinutes($this->lifetimeMinutes()),
                'last_sent_at' => now(),
            ])->save();

            return ['name' => $pending->name, 'code' => $code];
        });

        if ($sent !== null) {
            $this->sendCode($email, $sent['name'], $sent['code']);
        }
    }

    /** Creates the student and returns it, or returns null for any failure so callers answer identically. */
    public function verify(string $email, string $code): ?User
    {
        $email = mb_strtolower(trim($email));

        return DB::transaction(function () use ($email, $code): ?User {
            $pending = PendingRegistration::query()->where('email', $email)->lockForUpdate()->first();

            if (! $pending instanceof PendingRegistration) {
                return null;
            }

            $limit = (int) config('registration.max_verify_attempts');
            if ($pending->isExpired() || $pending->attempts >= $limit) {
                $pending->delete();

                return null;
            }

            if (! hash_equals($pending->code_hash, $this->hashCode($email, $code))) {
                $pending->attempts++;
                $pending->attempts >= $limit ? $pending->delete() : $pending->save();

                return null;
            }

            // The code is single use: the pending row goes whether or not the account can be created.
            $pending->delete();

            if ($this->accountExists($pending->email, $pending->student_number)) {
                return null;
            }

            try {
                // A savepoint, so a lost race on the unique index does not abort the whole transaction on PostgreSQL.
                return DB::transaction(fn (): User => $this->createStudent($pending));
            } catch (UniqueConstraintViolationException) {
                return null;
            }
        });
    }

    /** Removes expired pending registrations. */
    public function prune(): int
    {
        return PendingRegistration::query()->where('expires_at', '<', now())->delete();
    }

    private function createStudent(PendingRegistration $pending): User
    {
        $student = new User;
        $student->forceFill([
            'name' => $pending->name,
            'email' => $pending->email,
            'student_number' => $pending->student_number,
            // Already hashed when the registration was requested; the model's hashed cast keeps it as is.
            'password' => $pending->password,
            'role' => User::ROLE_STUDENT,
            'is_active' => true,
        ])->save();

        AdminActivityLog::query()->create([
            'actor_user_id' => $student->getKey(),
            'action' => AdminActivityLog::ACTION_STUDENT_SELF_REGISTERED,
            'subject_type' => 'student',
            'subject_id' => $student->getKey(),
            'subject_label' => $student->student_number.' · '.$student->name,
            'created_at' => now(),
        ]);

        return $student;
    }

    private function accountExists(string $email, string $studentNumber): bool
    {
        // The default scope ignores deleted accounts, so their email and student number can register again.
        return User::query()->where('email', $email)->orWhere('student_number', $studentNumber)->exists();
    }

    private function cooldownElapsed(PendingRegistration $pending): bool
    {
        return $pending->last_sent_at->lte(now()->subSeconds((int) config('registration.resend_cooldown_seconds')));
    }

    private function lifetimeMinutes(): int
    {
        return (int) config('registration.code_lifetime_minutes');
    }

    private function newCode(): string
    {
        $length = (int) config('registration.code_length');

        return str_pad((string) random_int(0, (10 ** $length) - 1), $length, '0', STR_PAD_LEFT);
    }

    /** A keyed hash bound to the email, compared with hash_equals. The code itself is never stored. */
    private function hashCode(string $email, string $code): string
    {
        return hash_hmac('sha256', $email.'|'.$code, (string) config('app.key'));
    }

    private function sendCode(string $email, string $name, string $code): void
    {
        try {
            Notification::route('mail', $email)
                ->notify(new MobileRegistrationCodeNotification($name, $code, $this->lifetimeMinutes()));
        } catch (Throwable $exception) {
            // The response stays generic. Log without the code (report() would add a stack trace with it).
            MailFailureLog::warn('Registration code email', $exception);
            $this->allowImmediateRetry($email);
        }
    }

    /** A code that was never delivered must not hold the person back with the resend cooldown. */
    private function allowImmediateRetry(string $email): void
    {
        PendingRegistration::query()
            ->where('email', $email)
            ->update(['last_sent_at' => now()->subSeconds((int) config('registration.resend_cooldown_seconds') + 1)]);
    }
}
