<?php

namespace Tests\Feature;

use App\Models\AdminActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AccountPasswordChangeTest extends TestCase
{
    use RefreshDatabase;

    private const CURRENT_PASSWORD = 'CurrentPassword123!';

    private const NEW_PASSWORD = 'NewStrongPassword456!';

    public function test_signed_in_user_can_change_password_and_keep_the_current_token(): void
    {
        $staff = User::factory()->securityStaff()->create(['password' => self::CURRENT_PASSWORD]);
        $currentToken = $staff->createToken('scanner-phone')->plainTextToken;
        $otherToken = $staff->createToken('old-phone')->plainTextToken;

        $this->withToken($currentToken)
            ->patchJson('/api/v1/auth/password', $this->payload())
            ->assertOk()
            ->assertJsonPath('message', 'Password updated. Other signed-in sessions were signed out.');

        $staff->refresh();
        $this->assertTrue(Hash::check(self::NEW_PASSWORD, $staff->password));
        $this->assertFalse(Hash::check(self::CURRENT_PASSWORD, $staff->password));
        $this->assertDatabaseCount('personal_access_tokens', 1);

        Auth::forgetGuards();
        $this->withToken($currentToken)->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('user.id', $staff->id);

        Auth::forgetGuards();
        $this->withToken($otherToken)->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_password_change_records_activity_without_password_data(): void
    {
        $student = User::factory()->create(['password' => self::CURRENT_PASSWORD]);
        $token = $student->createToken('student-app')->plainTextToken;

        $this->withToken($token)
            ->patchJson('/api/v1/auth/password', $this->payload())
            ->assertOk();

        $log = AdminActivityLog::query()->sole();
        $this->assertSame($student->id, $log->actor_user_id);
        $this->assertSame(AdminActivityLog::ACTION_ACCOUNT_PASSWORD_CHANGED, $log->action);
        $this->assertSame($student->id, $log->subject_id);

        $serializedLog = json_encode($log->getAttributes(), JSON_THROW_ON_ERROR);
        $this->assertStringNotContainsString(self::CURRENT_PASSWORD, $serializedLog);
        $this->assertStringNotContainsString(self::NEW_PASSWORD, $serializedLog);
    }

    public function test_new_password_works_for_sign_in_and_old_password_does_not(): void
    {
        $administrator = User::factory()->administrator()->create([
            'email' => 'admin@example.edu',
            'password' => self::CURRENT_PASSWORD,
        ]);
        $token = $administrator->createToken('admin-web')->plainTextToken;

        $this->withToken($token)
            ->patchJson('/api/v1/auth/password', $this->payload())
            ->assertOk();

        Auth::forgetGuards();
        $this->postJson('/api/v1/auth/login', [
            'identifier' => 'admin@example.edu',
            'password' => self::CURRENT_PASSWORD,
        ])->assertUnauthorized();
        $this->postJson('/api/v1/auth/login', [
            'identifier' => 'admin@example.edu',
            'password' => self::NEW_PASSWORD,
        ])->assertOk();
    }

    public function test_wrong_current_password_returns_a_generic_error_and_changes_nothing(): void
    {
        $student = User::factory()->create(['password' => self::CURRENT_PASSWORD]);
        $token = $student->createToken('student-app')->plainTextToken;
        $student->createToken('tablet');

        $response = $this->withToken($token)
            ->patchJson('/api/v1/auth/password', $this->payload(['current_password' => 'WrongPassword999!']))
            ->assertUnprocessable()
            ->assertJsonPath('errors.current_password.0', 'The current password is incorrect.');

        $this->assertStringNotContainsString('WrongPassword999!', $response->getContent());
        $this->assertTrue(Hash::check(self::CURRENT_PASSWORD, $student->refresh()->password));
        $this->assertDatabaseCount('personal_access_tokens', 2);
        $this->assertDatabaseCount('admin_activity_logs', 0);
    }

    public function test_invalid_new_password_input_is_rejected(): void
    {
        $student = User::factory()->create(['password' => self::CURRENT_PASSWORD]);
        $token = $student->createToken('student-app')->plainTextToken;

        $cases = [
            [['current_password' => null], 'current_password'],
            [['password' => 'short-pass1'], 'password'],
            [['password_confirmation' => 'DifferentPassword789!'], 'password'],
            [['password' => null], 'password'],
        ];

        foreach ($cases as [$overrides, $field]) {
            $this->withToken($token)
                ->patchJson('/api/v1/auth/password', $this->payload($overrides))
                ->assertUnprocessable()
                ->assertJsonValidationErrors($field);
        }

        $this->assertTrue(Hash::check(self::CURRENT_PASSWORD, $student->refresh()->password));
        $this->assertDatabaseCount('admin_activity_logs', 0);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->patchJson('/api/v1/auth/password', $this->payload())->assertUnauthorized();
    }

    public function test_inactive_user_cannot_change_password(): void
    {
        $staff = User::factory()->securityStaff()->create(['password' => self::CURRENT_PASSWORD]);
        $token = $staff->createToken('scanner-phone')->plainTextToken;
        $staff->forceFill(['is_active' => false])->save();

        $this->withToken($token)
            ->patchJson('/api/v1/auth/password', $this->payload())
            ->assertUnauthorized();

        $this->assertTrue(Hash::check(self::CURRENT_PASSWORD, $staff->refresh()->password));
        $this->assertDatabaseCount('admin_activity_logs', 0);
    }

    public function test_password_change_is_rate_limited(): void
    {
        $student = User::factory()->create(['password' => self::CURRENT_PASSWORD]);
        $token = $student->createToken('student-app')->plainTextToken;
        $wrongAttempt = $this->payload(['current_password' => 'WrongPassword999!']);

        for ($attempt = 0; $attempt < 6; $attempt++) {
            $this->withToken($token)
                ->patchJson('/api/v1/auth/password', $wrongAttempt)
                ->assertUnprocessable();
        }

        $this->withToken($token)
            ->patchJson('/api/v1/auth/password', $this->payload())
            ->assertTooManyRequests();

        $this->assertTrue(Hash::check(self::CURRENT_PASSWORD, $student->refresh()->password));
    }

    /**
     * @param  array<string, string|null>  $overrides
     * @return array<string, string|null>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'current_password' => self::CURRENT_PASSWORD,
            'password' => self::NEW_PASSWORD,
            'password_confirmation' => self::NEW_PASSWORD,
        ], $overrides);
    }
}
