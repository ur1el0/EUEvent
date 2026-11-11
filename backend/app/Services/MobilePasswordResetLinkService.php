<?php

namespace App\Services;

use App\Models\User;
use App\Support\MailFailureLog;
use Illuminate\Support\Facades\Password;
use Throwable;

/**
 * Sends a password-reset token to an eligible student or security staff account. The caller returns the
 * same response whatever happens here, so nothing in this class tells it whether an account exists or
 * whether the email was sent.
 */
class MobilePasswordResetLinkService
{
    public function send(string $email): void
    {
        $user = User::query()
            ->where('email', $email)
            ->whereIn('role', [User::ROLE_STUDENT, User::ROLE_SECURITY_STAFF])
            ->first();

        if (! $user instanceof User) {
            return;
        }

        try {
            Password::sendResetLink(['email' => $email]);
        } catch (Throwable $exception) {
            MailFailureLog::warn('Password reset email', $exception);
            $this->discardUndeliveredToken($user);
        }
    }

    /** The token was stored before the mail failed. Remove it so a retry is not held back by the broker's throttle. */
    private function discardUndeliveredToken(User $user): void
    {
        try {
            Password::broker()->deleteToken($user);
        } catch (Throwable $exception) {
            MailFailureLog::warn('Password reset cleanup', $exception);
        }
    }
}
