<?php

namespace Tests\Feature;

use App\Models\AdminActivityLog;
use App\Models\EventChangeLog;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\Concerns\BuildsEventFixtures;
use Tests\TestCase;

class AdminStudentDeletionTest extends TestCase
{
    use BuildsEventFixtures, RefreshDatabase;

    private function student(): User
    {
        return User::factory()->create([
            'name' => 'Ana Reyes',
            'email' => 'ana@euevent.test',
            'student_number' => '2026-00001',
            'password' => 'StudentPassword1!',
        ]);
    }

    public function test_only_administrators_can_delete_students(): void
    {
        $student = $this->student();
        $url = '/api/v1/admin/students/'.$student->id;

        $this->deleteJson($url)->assertUnauthorized();
        $this->withToken($student->createToken('t')->plainTextToken)->deleteJson($url)->assertForbidden();
        $this->withToken(User::factory()->securityStaff()->create()->createToken('t')->plainTextToken)->deleteJson($url)->assertForbidden();
        $this->assertNotSoftDeleted($student);
    }

    public function test_deleting_a_student_hides_them_ends_sessions_and_blocks_sign_in(): void
    {
        $admin = User::factory()->administrator()->create();
        $student = $this->student();
        $studentToken = $student->createToken('phone')->plainTextToken;
        $token = $this->adminToken($admin);

        $this->withToken($token)->deleteJson('/api/v1/admin/students/'.$student->id)->assertNoContent();

        $this->assertSoftDeleted($student);
        $this->assertSame(0, $student->tokens()->count());
        $this->assertDatabaseHas('admin_activity_logs', [
            'actor_user_id' => $admin->id,
            'action' => AdminActivityLog::ACTION_STUDENT_DELETED,
            'subject_label' => '2026-00001 · Ana Reyes',
        ]);
        Auth::forgetGuards();
        $this->withToken($studentToken)->getJson('/api/v1/student/tickets')->assertUnauthorized();
        $this->postJson('/api/v1/auth/login', ['identifier' => '2026-00001', 'password' => 'StudentPassword1!'])
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Invalid credentials.');
        $this->withToken($token)->getJson('/api/v1/admin/students')->assertOk()->assertJsonCount(0, 'students')->assertJsonPath('meta.total', 0);
    }

    public function test_active_tickets_are_revoked_and_stop_reaching_scanners(): void
    {
        $fixture = $this->makeEventFixture();
        $student = $this->student();
        $staff = User::factory()->securityStaff()->create();
        $this->assignStaff($fixture['eventGate'], $staff);
        $issued = $this->issueTicket($fixture['eventGate'], $student);
        $claimed = $this->issueTicket($fixture['eventGate'], User::factory()->create(), Ticket::STATUS_CLAIMED);
        $token = $this->adminToken();
        $manifestUrl = '/api/v1/gates/'.$fixture['eventGate']->id.'/manifest';
        $staffToken = $staff->createToken('scanner')->plainTextToken;

        $this->withToken($staffToken)->getJson($manifestUrl)->assertJsonCount(2, 'tickets');
        Auth::forgetGuards();
        $this->withToken($token)->deleteJson('/api/v1/admin/students/'.$student->id)->assertNoContent();

        $this->assertSame(Ticket::STATUS_REVOKED, $issued->fresh()->status);
        $this->assertSame(Ticket::STATUS_CLAIMED, $claimed->fresh()->status);
        $this->assertDatabaseCount('tickets', 2);
        $this->assertSame(2, $fixture['event']->fresh()->configuration_version);
        $this->assertDatabaseHas('event_change_logs', [
            'event_id' => $fixture['event']->id,
            'change_type' => 'ticket_revoked',
            'reason' => 'Student account deleted by an administrator.',
        ]);
        Auth::forgetGuards();
        $this->withToken($staffToken)->getJson($manifestUrl)->assertOk()->assertJsonCount(1, 'tickets');
    }

    public function test_tickets_in_several_events_are_all_revoked_and_the_roster_still_names_the_student(): void
    {
        $first = $this->makeEventFixture();
        $second = $this->makeEventFixture(venueName: 'Second Hall');
        $student = $this->student();
        $a = $this->issueTicket($first['eventGate'], $student);
        $b = $this->issueTicket($second['eventGate'], $student);
        $token = $this->adminToken();

        $this->withToken($token)->deleteJson('/api/v1/admin/students/'.$student->id)->assertNoContent();

        $this->assertSame([Ticket::STATUS_REVOKED, Ticket::STATUS_REVOKED], [$a->fresh()->status, $b->fresh()->status]);
        $this->assertSame(2, EventChangeLog::query()->where('change_type', 'ticket_revoked')->count());
        $this->withToken($token)->getJson('/api/v1/admin/events/'.$first['event']->id.'/tickets')
            ->assertOk()
            ->assertJsonPath('data.0.student.name', 'Ana Reyes')
            ->assertJsonPath('data.0.student.student_number', '2026-00001')
            ->assertJsonPath('data.0.status', Ticket::STATUS_REVOKED);
    }

    public function test_deleting_twice_is_a_204_with_one_record_and_one_revocation(): void
    {
        $fixture = $this->makeEventFixture();
        $student = $this->student();
        $this->issueTicket($fixture['eventGate'], $student);
        $token = $this->adminToken();
        $url = '/api/v1/admin/students/'.$student->id;

        $this->withToken($token)->deleteJson($url)->assertNoContent();
        $this->withToken($token)->deleteJson($url)->assertNoContent();

        $this->assertSame(1, AdminActivityLog::query()->where('action', AdminActivityLog::ACTION_STUDENT_DELETED)->count());
        $this->assertSame(1, EventChangeLog::query()->where('change_type', 'ticket_revoked')->count());
        $this->assertSame(2, $fixture['event']->fresh()->configuration_version);
    }

    public function test_missing_and_wrong_role_targets_are_a_404(): void
    {
        $token = $this->adminToken();

        $this->withToken($token)->deleteJson('/api/v1/admin/students/9999')->assertNotFound();
        $this->withToken($token)->deleteJson('/api/v1/admin/students/'.User::factory()->securityStaff()->create()->id)->assertNotFound();
        $this->withToken($token)->deleteJson('/api/v1/admin/students/'.User::factory()->administrator()->create()->id)->assertNotFound();
        $this->assertSame(0, AdminActivityLog::query()->count());
    }

    public function test_a_new_account_can_reuse_a_deleted_email_and_student_number(): void
    {
        $student = $this->student();
        $token = $this->adminToken();
        $payload = [
            'name' => 'Ana Again', 'student_number' => '2026-00001', 'email' => 'ana@euevent.test',
            'password' => 'AnotherPassword1!', 'password_confirmation' => 'AnotherPassword1!',
        ];

        $this->withToken($token)->postJson('/api/v1/admin/students', $payload)->assertJsonValidationErrors(['email', 'student_number']);
        $this->withToken($token)->deleteJson('/api/v1/admin/students/'.$student->id)->assertNoContent();
        $this->withToken($token)->postJson('/api/v1/admin/students', $payload)->assertCreated();

        $this->assertSame(2, User::withTrashed()->where('student_number', '2026-00001')->count());
        $this->postJson('/api/v1/auth/login', ['identifier' => '2026-00001', 'password' => 'AnotherPassword1!'])
            ->assertOk()
            ->assertJsonPath('user.name', 'Ana Again');
    }

    public function test_a_deleted_student_cannot_be_issued_a_new_ticket(): void
    {
        $fixture = $this->makeEventFixture();
        $student = $this->student();
        $token = $this->adminToken();
        $this->withToken($token)->deleteJson('/api/v1/admin/students/'.$student->id)->assertNoContent();

        $this->withToken($token)->postJson('/api/v1/admin/events/'.$fixture['event']->id.'/tickets', [
            'student_number' => '2026-00001',
            'event_gate_id' => $fixture['eventGate']->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('student_number');
    }
}
