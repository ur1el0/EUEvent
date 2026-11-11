<?php

namespace App\Support;

use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Logs a failed email send without leaking anything sensitive. report() would write the stack trace, and a
 * trace can include the arguments of the notification (the one-time code or reset token). This logs only the
 * exception class and its message, with the SMTP credentials and email addresses removed.
 */
final class MailFailureLog
{
    public static function warn(string $what, Throwable $exception): void
    {
        Log::warning($what.' could not be sent.', [
            'exception' => $exception::class,
            'reason' => self::redact($exception->getMessage()),
        ]);
    }

    public static function redact(string $message): string
    {
        $mailer = config('mail.default');
        $secrets = array_filter([
            config("mail.mailers.{$mailer}.username"),
            config("mail.mailers.{$mailer}.password"),
        ], static fn (mixed $value): bool => is_string($value) && strlen($value) >= 4);

        $message = $secrets === [] ? $message : str_replace($secrets, '[redacted]', $message);
        $message = (string) preg_replace('/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+/', '[address]', $message);
        $message = (string) preg_replace('/\s+/', ' ', $message);

        return mb_substr($message, 0, 300);
    }
}
