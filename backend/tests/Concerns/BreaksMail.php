<?php

namespace Tests\Concerns;

use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;

trait BreaksMail
{
    /**
     * Makes the default mailer fail instantly, with a message that contains the credentials and the
     * recipient, so tests can check that none of it reaches logs or output.
     */
    protected function breakMail(): void
    {
        Mail::extend('failing', fn (): AbstractTransport => new class extends AbstractTransport
        {
            protected function doSend(SentMessage $message): void
            {
                throw new TransportException(
                    'Authentication failed for sentinel-username with sentinel-password sending to ana.reyes@student.mseuf.edu.ph'
                );
            }

            public function __toString(): string
            {
                return 'failing://';
            }
        });

        config([
            'mail.default' => 'failing',
            'mail.mailers.failing' => [
                'transport' => 'failing',
                'host' => 'failing.example.test',
                'username' => 'sentinel-username',
                'password' => 'sentinel-password',
            ],
        ]);
    }
}
