<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** A short plain-text message used by `php artisan mail:test` to check the mail settings. */
class MailTestMessage extends Mailable
{
    public function envelope(): Envelope
    {
        return new Envelope(subject: 'EUEvent mail test');
    }

    public function content(): Content
    {
        return new Content(text: 'mail.test');
    }
}
