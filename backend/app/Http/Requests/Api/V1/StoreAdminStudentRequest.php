<?php

namespace App\Http\Requests\Api\V1;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdminStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && $user->isAdministrator();
    }

    protected function prepareForValidation(): void
    {
        $email = $this->input('email');
        $studentNumber = $this->input('student_number');
        $name = $this->input('name');

        $normalized = [];

        if (is_string($email)) {
            $normalized['email'] = mb_strtolower(trim($email));
        }

        if (is_string($studentNumber)) {
            $normalized['student_number'] = trim($studentNumber);
        }

        if (is_string($name)) {
            $normalized['name'] = trim($name);
        }

        $this->merge($normalized);
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'student_number' => ['required', 'string', 'max:32', Rule::unique('users', 'student_number')->whereNull('deleted_at')],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->whereNull('deleted_at')],
            'password' => ['required', 'string', 'min:12', 'confirmed'],
        ];
    }
}
