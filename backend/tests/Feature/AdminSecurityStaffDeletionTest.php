<?php

namespace Tests\Feature;

use App\Models\AdminActivityLog;
use App\Models\EventGateStaffAssignment;
use App\Models\ScanLog;
use App\Models\User;
use App\Notifications\MobilePasswordResetNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\BuildsEventFixtures;
use Tests\TestCase;

class AdminSecurityStaffDeletionTest extends TestCase
{
    use BuildsEventFixtures, RefreshDatabase;

    private function staff(array $attributes = []): User
    {
        return User::factory()->securityStaff()->create($attributes + ['email' => 'guard@euevent.test', 'password' => 'StaffPassword123!']);
    }

    public function test_only_administrators_can_delete_staff(): void
    {
        $staff = $this->staff();
        $url = '/api/v1/admin/security-staff/'.$staff->id;

        $this->deleteJson($url)->assertUnauthorized();
        $this->withToken(User::factory()->create()->createToken('t')->plainTextToken)->deleteJson($url)->assertForbidden();
        $this->withToken($staff->createToken('t')->plainTextToken)->deleteJson($url)->assertForbidden();
        $this->assertNotSoftDeleted($staff);
    }

    public function test_deleting_staff_hides_them_ends_sessions_and_blocks_sign_in(): void
    {
        $admin = User::factory()->administrator()->create();
        $staff = $this->staff(['name' => 'Gate Guard']);
        $staffToken = $staff->createToken('scanner')->plainTextToken;
        $token = $this->adminToken($admin);

        $this->withToken($token)->deleteJson('/api/v1/admin/security-staff/'.$staff->id)->assertNoContent();

        $this->assertSoftDeleted($staff);
        $this->assertSame(0, $staff->tokens()->count());
        $this->assertDatabaseHas('admin_activity_logs', [
            'actor_user_id' => $admin->id,
            'action' => AdminActivityLog::ACTION_SECURITY_STAFF_DELETED,
            'subject_id' => $staff->id,
            'subject_label' => 'Gate Guard · guard@euevent.test',
        ]);
        Auth::forgetGuards();
        $this->withToken($staffToken)->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->postJson('/api/v1/auth/login', ['identifier' => 'guard@euevent.test', 'password' => 'StaffPassword123!'])
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Invalid credentials.');
        $this->withToken($token)->getJson('/api/v1/admin/security-staff')->assertOk()->assertJsonCount(0, 'staff');
        $this->withToken($token)->getJson('/api/v1/admin/event-options')->assertOk()->assertJsonCount(0, 'security_staff');
    }

    public function test_deleting_twice_is_a_204_and_writes_one_activity_record(): void
    {
        $staff = $this->staff();
        $token = $this->adminToken();
        $url = '/api/v1/admin/security-staff/'.$staff->id;

        $this->withToken($token)->deleteJson($url)->assertNoContent();
        $this->withToken($token)->deleteJson($url)->assertNoContent();

        $this->assertSame(1, AdminActivityLog::query()->where('action', AdminActivityLog::ACTION_SECURITY_STAFF_DELETED)->count());
    }

    public function test_missing_and_wrong_role_targets_are_a_404(): void
    {
        $token = $this->adminToken();

        $this->withToken($token)->deleteJson('/api/v1/admin/security-staff/9999')->assertNotFound();
        $this->withToken($token)->deleteJson('/api/v1/admin/security-staff/'.User::factory()->create()->id)->assertNotFound();
        $this->withToken($token)->deleteJson('/api/v1/admin/security-staff/'.User::factory()->administrator()->create()->id)->assertNotFound();
        $this->assertSame(0, AdminActivityLog::query()->count());
    }

    public function test_scan_history_and_assignments_still_show_the_deleted_staff_member(): void
    {
        $fixture = $this->makeEventFixture();
        $staff = $this->staff(['name' => 'Gate Guard']);
        $this->assignStaff($fixture['eventGate'], $staff);
        $scan = $this->recordScan($this->issueTicket($fixture['eventGate'], User::factory()->create()), $staff);
        $token = $this->adminToken();

        $this->withToken($token)->deleteJson('/api/v1/admin/security-staff/'.$staff->id)->assertNoContent();

        $this->assertSame('Gate Guard', ScanLog::query()->findOrFail($scan->id)->scannedBy->name);
        $this->assertSame('Gate Guard', EventGateStaffAssignment::query()->firstOrFail()->user->name);
        $this->assertDatabaseCount('event_gate_staff_assignments', 1);
        $this->withToken($token)->getJson('/api/v1/admin/events/'.$fixture['event']->id)
            ->assertOk()
            ->assertJsonPath('event_gates.0.security_staff.0.name', 'Gate Guard');
        $this->withToken($token)->getJson('/api/v1/admin/activity-logs?type=scan')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Gate Guard']);
    }

    public function test_a_deleted_staff_member_keeps_existing_assignments_but_cannot_get_new_ones(): void
    {
        $fixture = $this->makeEventFixture();
        $staff = $this->staff();
        $this->assignStaff($fixture['eventGate'], $staff);
        $token = $this->adminToken();
        $this->withToken($token)->deleteJson('/api/v1/admin/security-staff/'.$staff->id)->assertNoContent();
        $url = '/api/v1/admin/events/'.$fixture['event']->id.'/gates';
        $gates = [['venue_gate_id' => $fixture['venueGate']->id, 'capacity' => 50, 'security_staff_ids' => [$staff->id]]];

        $this->withToken($token)->putJson($url, ['gates' => $gates, 'reason' => 'No change'])->assertOk();

        $other = $this->makeEventFixture(venueName: 'Other Hall');
        $this->withToken($token)->putJson('/api/v1/admin/events/'.$other['event']->id.'/gates', [
            'gates' => [['venue_gate_id' => $other['venueGate']->id, 'capacity' => 5, 'security_staff_ids' => [$staff->id]]],
            'reason' => 'Try the deleted account',
        ])->assertUnprocessable();
        $this->assertDatabaseCount('event_gate_staff_assignments', 1);
    }

    public function test_a_new_account_can_reuse_a_deleted_email(): void
    {
        $staff = $this->staff();
        $token = $this->adminToken();
        $payload = ['name' => 'New Guard', 'email' => 'guard@euevent.test', 'password' => 'AnotherPassword1!', 'password_confirmation' => 'AnotherPassword1!'];

        $this->withToken($token)->postJson('/api/v1/admin/security-staff', $payload)->assertUnprocessable();
        $this->withToken($token)->deleteJson('/api/v1/admin/security-staff/'.$staff->id)->assertNoContent();
        $this->withToken($token)->postJson('/api/v1/admin/security-staff', $payload)->assertCreated();

        $this->assertSame(2, User::withTrashed()->where('email', 'guard@euevent.test')->count());
        $this->postJson('/api/v1/auth/login', ['identifier' => 'guard@euevent.test', 'password' => 'AnotherPassword1!'])->assertOk();
    }

    public function test_a_deleted_account_gets_no_reset_email_and_the_response_stays_generic(): void
    {
        Notification::fake();
        $staff = $this->staff();
        DB::table('password_reset_tokens')->insert(['email' => $staff->email, 'token' => 'old-token', 'created_at' => now()]);
        $this->withToken($this->adminToken())->deleteJson('/api/v1/admin/security-staff/'.$staff->id)->assertNoContent();

        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'guard@euevent.test']);
        $generic = $this->postJson('/api/v1/auth/password/email', ['email' => 'guard@euevent.test'])->assertStatus(202);
        $unknown = $this->postJson('/api/v1/auth/password/email', ['email' => 'nobody@euevent.test'])->assertStatus(202);

        Notification::assertNothingSent();
        Notification::assertNotSentTo($staff, MobilePasswordResetNotification::class);
        $this->assertSame($unknown->json(), $generic->json());
        $this->postJson('/api/v1/auth/password/reset', [
            'email' => 'guard@euevent.test', 'token' => 'old-token',
            'password' => 'BrandNewPassword1!', 'password_confirmation' => 'BrandNewPassword1!',
        ])->assertUnprocessable();
    }
}
