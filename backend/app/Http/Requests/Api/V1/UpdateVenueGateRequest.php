<?php

namespace App\Http\Requests\Api\V1;

use App\Models\User;
use App\Models\Venue;
use App\Models\VenueGate;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateVenueGateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && $user->isAdministrator();
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        foreach (['code', 'name'] as $field) {
            if (is_string($this->input($field))) {
                $normalized[$field] = trim($this->input($field));
            }
        }

        $this->merge($normalized);
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        $venue = $this->route('venue');
        $gate = $this->route('gate');

        return [
            'code' => [
                'sometimes', 'required', 'string', 'max:32',
                StoreVenueGateRequest::uniqueCodeRule(
                    $venue instanceof Venue ? $venue->getKey() : 0,
                    $gate instanceof VenueGate ? $gate->getKey() : null,
                ),
            ],
            'name' => ['sometimes', 'required', 'string', 'max:120'],
        ];
    }

    /** @return array<int, callable(Validator): void> */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if (! $this->hasAny(['code', 'name'])) {
                    $validator->errors()->add('code', 'Provide at least one field to update.');
                }
            },
        ];
    }
}
