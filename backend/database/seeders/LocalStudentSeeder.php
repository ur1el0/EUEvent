<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use LogicException;
use RuntimeException;

/**
 * Creates one student account for local testing.
 *
 * Not called from DatabaseSeeder. Run it explicitly:
 *   php artisan db:seed --class=LocalStudentSeeder
 */
class LocalStudentSeeder extends Seeder
{
    public const EMAIL = 'student@euevent.test';

    public const STUDENT_NUMBER = '2026-00001';

    private const MIN_PASSWORD_LENGTH = 12;

    public function run(): void
    {
        if (app()->environment('production')) {
            throw new LogicException('The local student seeder must never run in production.');
        }

        $password = config('local_testing.student_password');

        if (! is_string($password) || strlen($password) < self::MIN_PASSWORD_LENGTH) {
            throw new RuntimeException(
                'Set LOCAL_STUDENT_PASSWORD in .env to at least '.self::MIN_PASSWORD_LENGTH.' characters before seeding.'
            );
        }

        if (User::query()->where('email', self::EMAIL)->exists()) {
            $this->command?->info(self::EMAIL.' already exists; nothing changed.');

            return;
        }

        $student = new User;
        $student->forceFill([
            'name' => 'Test Student',
            'email' => self::EMAIL,
            'student_number' => self::STUDENT_NUMBER,
            'password' => $password,
            'role' => User::ROLE_STUDENT,
        ])->save();

        $this->command?->info('Created '.self::EMAIL.' (student number '.self::STUDENT_NUMBER.').');
    }
}
