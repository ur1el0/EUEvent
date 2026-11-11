<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MobileRegistrationCodeNotification extends Notification
{
    public function __construct(
        private readonly string $name,
        private readonly string $code,
        private readonly int $lifetimeMinutes,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your EUEvent verification code')
            ->greeting('Hello '.$this->name.',')
            ->line('Enter this code in the EUEvent mobile app to finish creating your account:')
            ->line($this->code)
            ->line('The code expires after '.$this->lifetimeMinutes.' minutes and can only be used once.')
            ->line('If you did not try to register, you can ignore this email.');
    }
}
