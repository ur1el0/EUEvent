<?php

namespace Tests\Feature;

use App\Models\AdminActivityLog;
use App\Models\PendingRegistration;
use App\Models\User;
use App\Notifications\MobileRegistrationCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\RegistersStudents;
use Tests\TestCase;

class StudentSelfRegistrationTest extends TestCase
{
    use RefreshDatabase, RegistersStudents;

    private const GENERIC = 'If this email can be used to register, a verification code has been sent to it.';

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
    }

    public function test_registering_sends_a_code_and_creates_no_user_yet(): void
    {
        $response = $this->postJson('/api/v1/auth/register', $this->registrationPayload())
            ->assertStatus(202)
            ->assertExactJson(['message' => self::GENERIC]);

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('pending_registrations', 1);
        $code = $this->sentCode('ana.reyes@student.mseuf.edu.ph');
        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);
        $this->assertStringNotContainsString($code, $response->getContent());
    }

    /** @return array<string, array{0: string}> */
    public static function allowedEmails(): array
    {
        return [
            'student domain' => ['ana.reyes@student.mseuf.edu.ph'],
            'staff domain' => ['ana.reyes@mseuf.edu.ph'],
            'upper case input' => ['Ana.Reyes@STUDENT.MSEUF.EDU.PH'],
        ];
    }

    #[DataProvider('allowedEmails')]
    public function test_a_student_can_register_and_verify_with_an_allowed_domain(string $typedEmail): void
    {
        $email = mb_strtolower($typedEmail);
        $this->postJson('/api/v1/auth/register', $this->registrationPayload(['email' => $typedEmail, 'student_number' => 'b12-34567']))->assertStatus(202);
        $this->assertDatabaseCount('users', 0);

        $verify = $this->postJson('/api/v1/auth/register/verify', ['email' => $typedEmail, 'code' => $this->sentCode($email)])
            ->assertCreated();

        $this->assertArrayNotHasKey('token', $verify->json());
        $student = User::query()->where('email', $email)->firstOrFail();
        $this->assertSame(User::ROLE_STUDENT, $student->role);
        $this->assertTrue($student->is_active);
        $this->assertSame('B12-34567', $student->student_number);
        $this->assertSame('Ana Reyes', $student->name);
        $this->assertDatabaseCount('pending_registrations', 0);
        $this->postJson('/api/v1/auth/login', ['identifier' => 'B12-34567', 'password' => 'CorrectHorse123!'])
            ->assertOk()
            ->assertJsonPath('user.email', $email);
    }

    /** @return array<string, array{0: string}> */
    public static function lookalikeEmails(): array
    {
        return [
            'glued prefix' => ['ana@evilmseuf.edu.ph'],
            'suffix domain' => ['ana@student.mseuf.edu.ph.evil.com'],
            'staff domain suffix' => ['ana@mseuf.edu.ph.evil.com'],
            'trailing dot' => ['ana@mseuf.edu.ph.'],
            'sub domain' => ['ana@mail.student.mseuf.edu.ph'],
            'other school' => ['ana@gmail.com'],
            'allowed domain in local part' => ['ana@mseuf.edu.ph@evil.com'],
            'allowed domain in the name part' => ['mseuf.edu.ph@evil.com'],
        ];
    }

    #[DataProvider('lookalikeEmails')]
    public function test_lookalike_domains_are_rejected(string $email): void
    {
        $this->postJson('/api/v1/auth/register', $this->registrationPayload(['email' => $email]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        Notification::assertNothingSent();
        $this->assertDatabaseCount('pending_registrations', 0);
    }

    /** @return array<string, array{0: string}> */
    public static function badStudentNumbers(): array
    {
        return [
            'old format' => ['2026-00001'],
            'too few digits' => ['A12-3456'],
            'too many digits' => ['A12-345678'],
            'two letters' => ['AB2-34567'],
            'no dash' => ['A1234567'],
            'blank' => [''],
        ];
    }

    #[DataProvider('badStudentNumbers')]
    public function test_a_bad_student_number_is_rejected(string $number): void
    {
        $this->postJson('/api/v1/auth/register', $this->registrationPayload(['student_number' => $number]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('student_number');

        $this->assertDatabaseCount('pending_registrations', 0);
    }

    public function test_weak_unconfirmed_or_missing_fields_are_rejected(): void
    {
        $this->postJson('/api/v1/auth/register', $this->registrationPayload(['password' => 'short1', 'password_confirmation' => 'short1']))
            ->assertJsonValidationErrors('password');
        $this->postJson('/api/v1/auth/register', $this->registrationPayload(['password_confirmation' => 'Different123456!']))
            ->assertJsonValidationErrors('password');
        $this->postJson('/api/v1/auth/register', $this->registrationPayload(['name' => '']))->assertJsonValidationErrors('name');
        $this->postJson('/api/v1/auth/register', [])->assertJsonValidationErrors(['student_number', 'name', 'email', 'password']);

        Notification::assertNothingSent();
    }

    public function test_an_existing_email_or_number_gets_the_same_response_and_no_code(): void
    {
        User::factory()->create(['email' => 'taken@student.mseuf.edu.ph', 'student_number' => 'C34-56789']);

        $fresh = $this->postJson('/api/v1/auth/register', $this->registrationPayload());
        $emailTaken = $this->postJson('/api/v1/auth/register', $this->registrationPayload(['email' => 'taken@student.mseuf.edu.ph', 'student_number' => 'D11-11111']));
        $numberTaken = $this->postJson('/api/v1/auth/register', $this->registrationPayload(['email' => 'other@student.mseuf.edu.ph', 'student_number' => 'C34-56789']));

        $this->assertSame($fresh->status(), $emailTaken->status());
        $this->assertSame($fresh->json(), $emailTaken->json());
        $this->assertSame($fresh->json(), $numberTaken->json());
        Notification::assertSentOnDemandTimes(MobileRegistrationCodeNotification::class, 1);
        $this->assertDatabaseCount('pending_registrations', 1);
        $this->assertDatabaseMissing('pending_registrations', ['email' => 'taken@student.mseuf.edu.ph']);
    }

    public function test_a_deleted_students_email_and_number_can_register_again(): void
    {
        $old = User::factory()->create(['email' => 'ana.reyes@student.mseuf.edu.ph', 'student_number' => 'A12-34567']);
        $old->delete();

        $this->postJson('/api/v1/auth/register', $this->registrationPayload())->assertStatus(202);
        $this->postJson('/api/v1/auth/register/verify', ['email' => 'ana.reyes@student.mseuf.edu.ph', 'code' => $this->sentCode('ana.reyes@student.mseuf.edu.ph')])
            ->assertCreated();

        $this->assertSame(2, User::withTrashed()->where('email', 'ana.reyes@student.mseuf.edu.ph')->count());
        $this->assertSame(1, User::query()->where('student_number', 'A12-34567')->count());
    }

    public function test_no_password_or_code_is_stored_in_clear_or_leaked_to_logs(): void
    {
        $this->postJson('/api/v1/auth/register', $this->registrationPayload())->assertStatus(202);
        $code = $this->sentCode('ana.reyes@student.mseuf.edu.ph');
        $pending = PendingRegistration::query()->firstOrFail();

        $this->assertNotSame('CorrectHorse123!', $pending->password);
        $this->assertNotSame($code, $pending->code_hash);
        $this->assertSame(64, strlen($pending->code_hash));

        $verify = $this->postJson('/api/v1/auth/register/verify', ['email' => 'ana.reyes@student.mseuf.edu.ph', 'code' => $code])->assertCreated();
        $this->assertStringNotContainsString('CorrectHorse123!', $verify->getContent());
        $this->assertStringNotContainsString($code, $verify->getContent());

        $log = AdminActivityLog::query()->where('action', AdminActivityLog::ACTION_STUDENT_SELF_REGISTERED)->firstOrFail();
        $this->assertSame('A12-34567 · Ana Reyes', $log->subject_label);
        $this->assertSame($log->subject_id, $log->actor_user_id);
        $this->assertStringNotContainsString($code, json_encode($log->toArray()));
        $this->assertStringNotContainsString('CorrectHorse123!', json_encode($log->toArray()));
        $this->assertStringNotContainsString('@', json_encode($log->toArray()));
    }
}
