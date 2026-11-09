<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\MobilePasswordResetNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class MobilePasswordRecoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_link_request_has_the_same_response_for_known_and_unknown_accounts(): void
    {
        Notification::fake();
        $student = User::factory()->create(['email' => 'student@example.edu']);
        $staff = User::factory()->securityStaff()->create(['email' => 'staff@example.edu']);
        User::factory()->administrator()->create(['email' => 'admin@example.edu']);

        $knownResponse = $this->postJson('/api/v1/auth/password/email', [
            'email' => 'student@example.edu',
        ]);
        $unknownResponse = $this->postJson('/api/v1/auth/password/email', [
            'email' => 'unknown@example.edu',
        ]);
        $administratorResponse = $this->postJson('/api/v1/auth/password/email', [
            'email' => 'admin@example.edu',
        ]);
        $staffResponse = $this->postJson('/api/v1/auth/password/email', [
            'email' => 'staff@example.edu',
        ]);

        $knownResponse->assertAccepted();
        $this->assertSame($knownResponse->json(), $unknownResponse->json());
        $this->assertSame($knownResponse->json(), $administratorResponse->json());
        $this->assertSame($knownResponse->json(), $staffResponse->json());
        Notification::assertSentTo($student, MobilePasswordResetNotification::class);
        Notification::assertSentTo($staff, MobilePasswordResetNotification::class);
        Notification::assertNotSentTo(
            User::query()->where('email', 'admin@example.edu')->firstOrFail(),
            MobilePasswordResetNotification::class,
        );
    }

    public function test_valid_reset_token_changes_password_and_revokes_existing_sessions(): void
    {
        $student = User::factory()->create([
            'email' => 'student@example.edu',
            'password' => 'OldPassword123!',
        ]);
        $existingToken = $student->createToken('old-phone')->plainTextToken;
        $resetToken = Password::broker()->createToken($student);

        $this->postJson('/api/v1/auth/password/reset', [
            'email' => 'student@example.edu',
            'token' => $resetToken,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])->assertOk()
            ->assertJsonPath('message', 'Password updated. Sign in again with your new password.');

        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->withToken($existingToken)
            ->getJson('/api/v1/auth/me')
            ->assertUnauthorized();
        $this->postJson('/api/v1/auth/login', [
            'identifier' => $student->student_number,
            'password' => 'NewPassword123!',
        ])->assertOk();
        $this->postJson('/api/v1/auth/password/reset', [
            'email' => 'student@example.edu',
            'token' => $resetToken,
            'password' => 'AnotherPassword123!',
            'password_confirmation' => 'AnotherPassword123!',
        ])->assertUnprocessable();
    }

    public function test_reset_rejects_passwords_shorter_than_twelve_characters(): void
    {
        $response = $this->postJson('/api/v1/auth/password/reset', [
            'email' => 'student@example.edu',
            'token' => 'not-a-real-token',
            'password' => 'short',
            'password_confirmation' => 'short',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('password');
    }
}
