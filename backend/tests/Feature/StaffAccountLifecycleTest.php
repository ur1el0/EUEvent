<?php

namespace Tests\Feature;

use App\Models\AdminActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class StaffAccountLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrator_can_deactivate_staff_and_revoke_online_tokens(): void
    {
        $administrator = User::factory()->administrator()->create();
        $staff = User::factory()->securityStaff()->create([
            'email' => 'staff@example.edu',
            'password' => 'StaffPassword123!',
        ]);
        $administratorToken = $administrator->createToken('admin-web')->plainTextToken;
        $staffToken = $staff->createToken('scanner-phone')->plainTextToken;

        $this->withToken($administratorToken)
            ->patchJson('/api/v1/admin/security-staff/'.$staff->id.'/status', ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('staff.id', $staff->id)
            ->assertJsonPath('staff.is_active', false);

        $this->assertDatabaseHas('users', [
            'id' => $staff->id,
            'is_active' => false,
        ]);
        $this->assertDatabaseHas('admin_activity_logs', [
            'actor_user_id' => $administrator->id,
            'action' => AdminActivityLog::ACTION_SECURITY_STAFF_DEACTIVATED,
            'subject_id' => $staff->id,
        ]);
        $this->assertDatabaseCount('personal_access_tokens', 1);
        Auth::forgetGuards();
        $this->withToken($staffToken)
            ->getJson('/api/v1/auth/me')
            ->assertUnauthorized();
        $this->postJson('/api/v1/auth/login', [
            'identifier' => 'staff@example.edu',
            'password' => 'StaffPassword123!',
        ])->assertUnauthorized();
    }

    public function test_reactivation_restores_sign_in_but_does_not_restore_revoked_tokens(): void
    {
        $administrator = User::factory()->administrator()->create();
        $staff = User::factory()->securityStaff()->create(['password' => 'StaffPassword123!']);
        $administratorToken = $administrator->createToken('admin-web')->plainTextToken;
        $staffToken = $staff->createToken('scanner-phone')->plainTextToken;

        $this->withToken($administratorToken)
            ->patchJson('/api/v1/admin/security-staff/'.$staff->id.'/status', ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('staff.is_active', false);

        $this->patchJson('/api/v1/admin/security-staff/'.$staff->id.'/status', ['is_active' => true])
            ->assertOk()
            ->assertJsonPath('staff.is_active', true);

        Auth::forgetGuards();
        $this->withToken($staffToken)
            ->getJson('/api/v1/auth/me')
            ->assertUnauthorized();
        $this->postJson('/api/v1/auth/login', [
            'identifier' => $staff->email,
            'password' => 'StaffPassword123!',
        ])->assertOk();
        $this->assertDatabaseHas('admin_activity_logs', [
            'actor_user_id' => $administrator->id,
            'action' => AdminActivityLog::ACTION_SECURITY_STAFF_ACTIVATED,
            'subject_id' => $staff->id,
        ]);
    }

    public function test_non_administrator_cannot_change_staff_access(): void
    {
        $student = User::factory()->create();
        $staff = User::factory()->securityStaff()->create();

        $studentToken = $student->createToken('student-app')->plainTextToken;

        $this->withToken($studentToken)
            ->patchJson('/api/v1/admin/security-staff/'.$staff->id.'/status', ['is_active' => false])
            ->assertForbidden();

        $this->assertDatabaseHas('users', [
            'id' => $staff->id,
            'is_active' => true,
        ]);
    }
}
