<?php

namespace Tests\Feature;

use App\Mail\MailTestMessage;
use Illuminate\Support\Facades\Mail;
use Tests\Concerns\BreaksMail;
use Tests\TestCase;

class SendTestMailCommandTest extends TestCase
{
    use BreaksMail;

    public function test_it_sends_the_test_message_and_shows_only_non_secret_settings(): void
    {
        Mail::fake();
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp.example.test',
            'mail.mailers.smtp.username' => 'sentinel-username',
            'mail.mailers.smtp.password' => 'sentinel-password',
            'mail.from.address' => 'sender@example.test',
        ]);

        $this->artisan('mail:test', ['email' => 'someone@student.mseuf.edu.ph'])
            ->expectsOutputToContain('smtp.example.test')
            ->expectsOutputToContain('sender@example.test')
            ->doesntExpectOutputToContain('sentinel-username')
            ->doesntExpectOutputToContain('sentinel-password')
            ->assertSuccessful();

        Mail::assertSent(MailTestMessage::class, fn (MailTestMessage $mail): bool => $mail->hasTo('someone@student.mseuf.edu.ph'));
    }

    public function test_it_refuses_to_run_with_the_log_or_array_mailer(): void
    {
        Mail::fake();

        foreach (['log', 'array'] as $mailer) {
            config(['mail.default' => $mailer]);

            $this->artisan('mail:test', ['email' => 'someone@student.mseuf.edu.ph'])
                ->expectsOutputToContain('nothing would be delivered')
                ->assertFailed();
        }

        Mail::assertNothingSent();
    }

    public function test_it_rejects_an_invalid_address(): void
    {
        Mail::fake();
        config(['mail.default' => 'smtp']);

        $this->artisan('mail:test', ['email' => 'not-an-email'])->assertFailed();

        Mail::assertNothingSent();
    }

    public function test_a_send_failure_is_reported_without_credentials(): void
    {
        $this->breakMail();

        $this->artisan('mail:test', ['email' => 'someone@student.mseuf.edu.ph'])
            ->expectsOutputToContain('could not be sent')
            ->doesntExpectOutputToContain('sentinel-username')
            ->doesntExpectOutputToContain('sentinel-password')
            ->doesntExpectOutputToContain('ana.reyes@')
            ->assertFailed();
    }
}
