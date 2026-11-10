<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MobilePasswordResetNotification extends Notification
{
    public function __construct(private readonly string $token) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Reset your EUEvent password')
            ->greeting('Hello '.$notifiable->name.',')
            ->line('Enter this one-time reset token in the EUEvent mobile app:')
            ->line($this->token)
            ->line('The token expires after 60 minutes and can only be used once.')
            ->line('If you did not request this reset, you can ignore this email.');
    }
}
