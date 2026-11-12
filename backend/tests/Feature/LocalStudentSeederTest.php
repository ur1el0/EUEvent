<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\LocalStudentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use LogicException;
use RuntimeException;
use Tests\TestCase;

class LocalStudentSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_the_student_with_the_configured_password(): void
    {
        config(['local_testing.student_password' => 'a-long-local-password']);

        $this->seed(LocalStudentSeeder::class);

        $student = User::query()->where('email', 'student@euevent.test')->firstOrFail();
        $this->assertSame('Test Student', $student->name);
        $this->assertSame('2026-00001', $student->student_number);
        $this->assertSame(User::ROLE_STUDENT, $student->role);
        $this->assertTrue(Hash::check('a-long-local-password', $student->password));
    }

    public function test_it_refuses_to_run_in_production(): void
    {
        config(['local_testing.student_password' => 'a-long-local-password']);
        $this->app->detectEnvironment(fn () => 'production');

        try {
            // Run it directly: `db:seed` itself asks for confirmation in production before the seeder starts.
            $this->app->make(LocalStudentSeeder::class)->run();
            $this->fail('The seeder ran in production.');
        } catch (LogicException $exception) {
            $this->assertStringContainsString('production', $exception->getMessage());
        }

        $this->assertDatabaseCount('users', 0);
    }

    public function test_it_refuses_a_missing_or_short_password(): void
    {
        foreach ([null, '', 'short-pass-'] as $password) {
            config(['local_testing.student_password' => $password]);

            try {
                $this->app->make(LocalStudentSeeder::class)->run();
                $this->fail('The seeder ran without a valid password.');
            } catch (RuntimeException $exception) {
                $this->assertStringContainsString('LOCAL_STUDENT_PASSWORD', $exception->getMessage());
            }
        }

        $this->assertDatabaseCount('users', 0);
    }

    public function test_it_changes_nothing_when_the_email_already_exists(): void
    {
        config(['local_testing.student_password' => 'a-long-local-password']);
        $existing = User::factory()->create([
            'name' => 'Someone Else',
            'email' => 'student@euevent.test',
            'password' => 'original-password-1',
        ]);
        $originalHash = $existing->password;

        $this->seed(LocalStudentSeeder::class);
        $this->seed(LocalStudentSeeder::class);

        $this->assertDatabaseCount('users', 1);
        $existing->refresh();
        $this->assertSame('Someone Else', $existing->name);
        $this->assertSame($originalHash, $existing->password);
    }

    public function test_running_it_twice_creates_one_account(): void
    {
        config(['local_testing.student_password' => 'a-long-local-password']);

        $this->seed(LocalStudentSeeder::class);
        $this->seed(LocalStudentSeeder::class);

        $this->assertDatabaseCount('users', 1);
    }

    public function test_the_default_seeder_does_not_run_it(): void
    {
        config(['local_testing.student_password' => 'a-long-local-password']);

        $this->seed(DatabaseSeeder::class);

        $this->assertDatabaseMissing('users', ['email' => 'student@euevent.test']);
    }
}
