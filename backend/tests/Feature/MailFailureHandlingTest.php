<?php

namespace Tests\Feature;

use App\Models\PendingRegistration;
use App\Models\User;
use App\Notifications\MobilePasswordResetNotification;
use App\Notifications\MobileRegistrationCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\BreaksMail;
use Tests\Concerns\RegistersStudents;
use Tests\TestCase;

class MailFailureHandlingTest extends TestCase
{
    use BreaksMail, RefreshDatabase, RegistersStudents;

    private const EMAIL = 'ana.reyes@student.mseuf.edu.ph';

    /** @return array<string, mixed> */
    private function loggedContext(string $message): array
    {
        $context = null;

        Log::shouldHaveReceived('warning')->withArgs(function (string $logged, array $ctx = []) use ($message, &$context): bool {
            if ($logged !== $message) {
                return false;
            }
            $context = $ctx;

            return true;
        })->once();

        return $context ?? [];
    }

    public function test_a_failed_registration_email_keeps_the_generic_response_and_logs_no_secrets(): void
    {
        $this->breakMail();
        Log::spy();

        $ok = $this->postJson('/api/v1/auth/register', $this->registrationPayload())->assertStatus(202);

        $existing = User::factory()->create(['email' => 'taken@student.mseuf.edu.ph', 'student_number' => 'C34-56789']);
        $other = $this->postJson('/api/v1/auth/register', $this->registrationPayload(['email' => $existing->email, 'student_number' => 'C34-56789']));
        $this->assertSame($other->json(), $ok->json());

        $context = $this->loggedContext('Registration code email could not be sent.');
        $this->assertSame(['exception', 'reason'], array_keys($context));
        $logged = json_encode($context);
        $this->assertStringNotContainsString('sentinel-username', $logged);
        $this->assertStringNotContainsString('sentinel-password', $logged);
        $this->assertStringNotContainsString(self::EMAIL, $logged);
        $this->assertDatabaseCount('users', 1);
    }

    public function test_a_failed_send_does_not_block_an_immediate_retry(): void
    {
        $this->breakMail();
        $this->postJson('/api/v1/auth/register', $this->registrationPayload())->assertStatus(202);
        $this->assertDatabaseCount('pending_registrations', 1);

        // Mail works again. The code that never arrived must not hold back a resend with the cooldown.
        Notification::fake();
        config(['mail.default' => 'array']);
        $this->postJson('/api/v1/auth/register/resend', ['email' => self::EMAIL])->assertStatus(202);

        Notification::assertSentOnDemandTimes(MobileRegistrationCodeNotification::class, 1);
        $this->postJson('/api/v1/auth/register/verify', ['email' => self::EMAIL, 'code' => $this->sentCode(self::EMAIL)])->assertCreated();
    }

    public function test_registering_again_after_a_failed_send_replaces_the_pending_row_at_once(): void
    {
        $this->breakMail();
        $this->postJson('/api/v1/auth/register', $this->registrationPayload())->assertStatus(202);
        $firstHash = PendingRegistration::query()->firstOrFail()->code_hash;

        Notification::fake();
        $this->postJson('/api/v1/auth/register', $this->registrationPayload())->assertStatus(202);

        Notification::assertSentOnDemandTimes(MobileRegistrationCodeNotification::class, 1);
        $this->assertNotSame($firstHash, PendingRegistration::query()->firstOrFail()->code_hash);
    }

    public function test_a_failed_reset_email_keeps_the_generic_response_discards_the_token_and_logs_no_secrets(): void
    {
        User::factory()->create(['email' => 'student@student.mseuf.edu.ph']);
        $this->breakMail();
        Log::spy();

        $known = $this->postJson('/api/v1/auth/password/email', ['email' => 'student@student.mseuf.edu.ph'])->assertStatus(202);
        $unknown = $this->postJson('/api/v1/auth/password/email', ['email' => 'nobody@student.mseuf.edu.ph'])->assertStatus(202);

        $this->assertSame($unknown->json(), $known->json());
        $this->assertSame(0, DB::table('password_reset_tokens')->count());
        $context = $this->loggedContext('Password reset email could not be sent.');
        $this->assertSame(['exception', 'reason'], array_keys($context));
        $this->assertStringNotContainsString('sentinel', json_encode($context));
        $this->assertStringNotContainsString('student@student.mseuf.edu.ph', json_encode($context));
    }

    public function test_a_reset_can_be_requested_again_straight_after_a_failed_send(): void
    {
        User::factory()->create(['email' => 'student@student.mseuf.edu.ph']);
        $this->breakMail();
        $this->postJson('/api/v1/auth/password/email', ['email' => 'student@student.mseuf.edu.ph'])->assertStatus(202);

        Notification::fake();
        config(['mail.default' => 'array']);
        $this->postJson('/api/v1/auth/password/email', ['email' => 'student@student.mseuf.edu.ph'])->assertStatus(202);

        Notification::assertSentTo(User::query()->where('email', 'student@student.mseuf.edu.ph')->firstOrFail(), MobilePasswordResetNotification::class);
    }
}
