<?php

namespace Tests\Feature;

use App\Models\PendingRegistration;
use App\Models\User;
use App\Notifications\MobileRegistrationCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\RegistersStudents;
use Tests\TestCase;

class StudentRegistrationVerificationTest extends TestCase
{
    use RefreshDatabase, RegistersStudents;

    private const EMAIL = 'ana.reyes@student.mseuf.edu.ph';

    private const INVALID = 'The code is invalid or expired. Request a new code and try again.';

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
    }

    private function register(array $overrides = []): void
    {
        $this->postJson('/api/v1/auth/register', $this->registrationPayload($overrides))->assertStatus(202);
    }

    private function verify(string $code, string $email = self::EMAIL): TestResponse
    {
        return $this->postJson('/api/v1/auth/register/verify', ['email' => $email, 'code' => $code]);
    }

    private function wrongCode(): string
    {
        return $this->sentCode(self::EMAIL) === '000000' ? '111111' : '000000';
    }

    public function test_a_wrong_code_gets_a_generic_failure_and_creates_nothing(): void
    {
        $this->register();

        $this->verify($this->wrongCode())->assertUnprocessable()->assertJsonPath('message', self::INVALID);

        $this->assertDatabaseCount('users', 0);
        $this->assertSame(1, PendingRegistration::query()->firstOrFail()->attempts);
    }

    public function test_an_unknown_email_gets_the_same_failure_as_a_wrong_code(): void
    {
        $this->register();

        $this->verify('123456', 'nobody@student.mseuf.edu.ph')->assertUnprocessable()->assertJsonPath('message', self::INVALID);
        $this->verify($this->wrongCode())->assertUnprocessable()->assertJsonPath('message', self::INVALID);
        $this->postJson('/api/v1/auth/register/verify', ['email' => self::EMAIL, 'code' => 'abc'])->assertJsonValidationErrors('code');
    }

    public function test_an_expired_code_is_rejected_and_removed(): void
    {
        $this->register();
        $code = $this->sentCode(self::EMAIL);

        $this->travel(16)->minutes();
        $this->verify($code)->assertUnprocessable()->assertJsonPath('message', self::INVALID);

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('pending_registrations', 0);
    }

    public function test_the_attempt_limit_removes_the_registration_even_for_the_right_code(): void
    {
        $this->register();
        $code = $this->sentCode(self::EMAIL);
        $wrong = $this->wrongCode();

        foreach (range(1, 5) as $ignored) {
            $this->verify($wrong)->assertUnprocessable();
        }

        $this->assertDatabaseCount('pending_registrations', 0);
        $this->verify($code)->assertUnprocessable()->assertJsonPath('message', self::INVALID);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_a_code_works_once(): void
    {
        $this->register();
        $code = $this->sentCode(self::EMAIL);

        $this->verify($code)->assertCreated();
        $this->verify($code)->assertUnprocessable()->assertJsonPath('message', self::INVALID);

        $this->assertSame(1, User::query()->where('email', self::EMAIL)->count());
    }

    public function test_an_email_or_number_taken_in_the_meantime_gets_the_generic_failure(): void
    {
        $this->register();
        $code = $this->sentCode(self::EMAIL);
        User::factory()->create(['email' => 'someone.else@student.mseuf.edu.ph', 'student_number' => 'A12-34567']);

        $this->verify($code)->assertUnprocessable()->assertJsonPath('message', self::INVALID);

        $this->assertDatabaseMissing('users', ['email' => self::EMAIL]);
        $this->assertDatabaseCount('pending_registrations', 0);
    }

    public function test_resend_honours_the_cooldown_and_a_new_code_replaces_the_old_one(): void
    {
        $this->register();
        $first = $this->sentCode(self::EMAIL);

        $this->postJson('/api/v1/auth/register/resend', ['email' => self::EMAIL])->assertStatus(202);
        Notification::assertSentOnDemandTimes(MobileRegistrationCodeNotification::class, 1);

        $this->travel(61)->seconds();
        $this->postJson('/api/v1/auth/register/resend', ['email' => self::EMAIL])->assertStatus(202);
        Notification::assertSentOnDemandTimes(MobileRegistrationCodeNotification::class, 2);
        $second = $this->sentCode(self::EMAIL);

        $this->assertNotSame($first, $second);
        if ($first !== $second) {
            $this->verify($first)->assertUnprocessable();
        }
        $this->verify($second)->assertCreated();
    }

    public function test_resend_for_an_unknown_email_looks_the_same_and_sends_nothing(): void
    {
        $this->register();
        $known = $this->postJson('/api/v1/auth/register/resend', ['email' => self::EMAIL]);
        $unknown = $this->postJson('/api/v1/auth/register/resend', ['email' => 'nobody@student.mseuf.edu.ph']);

        $this->assertSame($known->status(), $unknown->status());
        $this->assertSame($known->json(), $unknown->json());
        Notification::assertSentOnDemandTimes(MobileRegistrationCodeNotification::class, 1);
    }

    public function test_registering_again_inside_the_cooldown_keeps_one_code_and_later_replaces_it(): void
    {
        $this->register();
        $this->register(['name' => 'Ana R. Reyes']);
        Notification::assertSentOnDemandTimes(MobileRegistrationCodeNotification::class, 1);

        $this->travel(61)->seconds();
        $this->register(['name' => 'Ana R. Reyes']);

        Notification::assertSentOnDemandTimes(MobileRegistrationCodeNotification::class, 2);
        $this->assertDatabaseCount('pending_registrations', 1);
        $this->verify($this->sentCode(self::EMAIL))->assertCreated();
        $this->assertSame('Ana R. Reyes', User::query()->where('email', self::EMAIL)->firstOrFail()->name);
    }

    public function test_registration_is_throttled_per_address_and_per_email(): void
    {
        foreach (range(1, 3) as $ignored) {
            $this->postJson('/api/v1/auth/register', $this->registrationPayload())->assertStatus(202);
        }
        $this->postJson('/api/v1/auth/register', $this->registrationPayload())->assertStatus(429);

        $this->travel(2)->hours();
        foreach (range(1, 5) as $number) {
            $this->postJson('/api/v1/auth/register', $this->registrationPayload(['email' => "student{$number}@student.mseuf.edu.ph"]))->assertStatus(202);
        }
        $this->postJson('/api/v1/auth/register', $this->registrationPayload(['email' => 'student6@student.mseuf.edu.ph']))->assertStatus(429);
    }

    public function test_verifying_and_resending_are_throttled(): void
    {
        foreach (range(1, 10) as $ignored) {
            $this->verify('123456');
        }
        $this->verify('123456')->assertStatus(429);

        $this->travel(2)->hours();
        foreach (range(1, 5) as $number) {
            $this->postJson('/api/v1/auth/register/resend', ['email' => "student{$number}@student.mseuf.edu.ph"])->assertStatus(202);
        }
        $this->postJson('/api/v1/auth/register/resend', ['email' => 'student6@student.mseuf.edu.ph'])->assertStatus(429);
    }

    public function test_the_prune_command_removes_only_expired_registrations(): void
    {
        $this->register();
        $this->travel(10)->minutes();
        $this->register(['email' => 'second@student.mseuf.edu.ph', 'student_number' => 'B22-22222']);
        $this->travel(7)->minutes();

        $this->artisan('registrations:prune')->assertSuccessful();

        $this->assertDatabaseCount('pending_registrations', 1);
        $this->assertDatabaseHas('pending_registrations', ['email' => 'second@student.mseuf.edu.ph']);
    }
}
