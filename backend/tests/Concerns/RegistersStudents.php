<?php

namespace Tests\Concerns;

use App\Notifications\MobileRegistrationCodeNotification;
use Illuminate\Support\Facades\Notification;

trait RegistersStudents
{
    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    protected function registrationPayload(array $overrides = []): array
    {
        return $overrides + [
            'student_number' => 'A12-34567',
            'name' => 'Ana Reyes',
            'email' => 'ana.reyes@student.mseuf.edu.ph',
            'password' => 'CorrectHorse123!',
            'password_confirmation' => 'CorrectHorse123!',
        ];
    }

    /** The newest code mailed to this address. Needs Notification::fake(). */
    protected function sentCode(string $email): string
    {
        $code = null;

        Notification::assertSentOnDemand(
            MobileRegistrationCodeNotification::class,
            function (MobileRegistrationCodeNotification $notification, array $channels, object $notifiable) use (&$code, $email): bool {
                if (($notifiable->routes['mail'] ?? null) !== $email) {
                    return false;
                }

                $code = (fn (): string => $this->code)->call($notification);

                return true;
            },
        );

        return (string) $code;
    }
}
