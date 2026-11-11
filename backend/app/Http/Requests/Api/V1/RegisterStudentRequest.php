<?php

namespace App\Http\Requests\Api\V1;

use App\Rules\AllowedRegistrationEmail;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Public registration. Uniqueness of the email and student number is deliberately not validated here,
 * because a 422 for "already taken" would reveal which accounts exist.
 */
class RegisterStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        if (is_string($this->input('email'))) {
            $normalized['email'] = mb_strtolower(trim($this->input('email')));
        }
        if (is_string($this->input('student_number'))) {
            $normalized['student_number'] = mb_strtoupper(trim($this->input('student_number')));
        }
        if (is_string($this->input('name'))) {
            $normalized['name'] = trim($this->input('name'));
        }

        $this->merge($normalized);
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'student_number' => ['required', 'string', 'max:32', 'regex:'.config('registration.student_number_pattern')],
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', new AllowedRegistrationEmail],
            'password' => ['required', 'string', 'min:12', 'max:255', 'confirmed'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'student_number.regex' => 'Enter your student number in the format A12-34567.',
        ];
    }
}
