<?php

namespace App\Console\Commands;

use App\Mail\MailTestMessage;
use App\Support\MailFailureLog;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Throwable;

#[Signature('mail:test {email : The address to send the test message to}')]
#[Description('Send a test email with the configured mailer')]
class SendTestMail extends Command
{
    public function handle(): int
    {
        $email = (string) $this->argument('email');

        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $this->error('That is not a valid email address.');

            return self::INVALID;
        }

        $mailer = (string) config('mail.default');

        if (in_array($mailer, ['log', 'array'], true)) {
            $this->error("MAIL_MAILER is \"{$mailer}\", so nothing would be delivered.");
            $this->line('Set MAIL_MAILER=smtp and the other MAIL_* values in your .env, run `php artisan config:clear`, then try again.');

            return self::FAILURE;
        }

        // Only non-secret settings are shown. The username and password are never printed.
        $this->line('Mailer:       '.$mailer);
        $this->line('Host:         '.(config("mail.mailers.{$mailer}.host") ?? '(not set)'));
        $this->line('From address: '.(config('mail.from.address') ?? '(not set)'));

        try {
            Mail::to($email)->send(new MailTestMessage);
        } catch (Throwable $exception) {
            $this->error('The message could not be sent: '.MailFailureLog::redact($exception->getMessage()));
            $this->line('See the troubleshooting section of docs/setup-guide.md.');

            return self::FAILURE;
        }

        $this->info('Test message handed to the mail server for '.$email.'. Check the inbox and the junk folder.');

        return self::SUCCESS;
    }
}
