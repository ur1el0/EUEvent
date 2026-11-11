<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * The text after the last "@" must EQUAL one of the allowed domains. It is deliberately not an
 * "ends with" check, so evilmseuf.edu.ph and student.mseuf.edu.ph.evil.com never pass.
 */
class AllowedRegistrationEmail implements ValidationRule
{
    public static function domainIsAllowed(string $email): bool
    {
        $email = mb_strtolower(trim($email));
        $at = strrpos($email, '@');

        if ($at === false) {
            return false;
        }

        return in_array(substr($email, $at + 1), config('registration.allowed_email_domains', []), true);
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! self::domainIsAllowed($value)) {
            $fail('Use your MSEUF email address.');
        }
    }
}
