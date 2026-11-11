<?php

/*
 * Student self-registration (ADR 016). Every value can be set in .env; the defaults below apply otherwise.
 */
return [
    /*
     * The part of the email after the last "@" must equal one of these exactly. A longer or lookalike
     * domain such as evilmseuf.edu.ph never matches.
     */
    'allowed_email_domains' => array_values(array_filter(array_map(
        static fn (string $domain): string => mb_strtolower(trim($domain)),
        explode(',', (string) env('REGISTRATION_ALLOWED_EMAIL_DOMAINS', 'student.mseuf.edu.ph,mseuf.edu.ph')),
    ))),

    // Case-insensitive input is accepted and the number is stored in uppercase.
    'student_number_pattern' => env('REGISTRATION_STUDENT_NUMBER_PATTERN', '/^[A-Z]\d{2}-\d{5}$/'),

    'code_length' => (int) env('REGISTRATION_CODE_LENGTH', 6),
    'code_lifetime_minutes' => (int) env('REGISTRATION_CODE_LIFETIME_MINUTES', 15),
    'max_verify_attempts' => (int) env('REGISTRATION_MAX_VERIFY_ATTEMPTS', 5),
    'resend_cooldown_seconds' => (int) env('REGISTRATION_RESEND_COOLDOWN_SECONDS', 60),
];
