<?php

namespace App\Http\Requests\Api\V1;

use App\Models\User;
use App\Models\Venue;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateVenueRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && $user->isAdministrator();
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        foreach (['name', 'location_details'] as $field) {
            if (is_string($this->input($field))) {
                $normalized[$field] = trim($this->input($field));
            }
        }

        if (($normalized['location_details'] ?? null) === '') {
            $normalized['location_details'] = null;
        }

        $this->merge($normalized);
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        $venue = $this->route('venue');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:150', StoreVenueRequest::uniqueNameRule($venue instanceof Venue ? $venue->getKey() : null)],
            'location_details' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }

    /** @return array<int, callable(Validator): void> */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if (! $this->hasAny(['name', 'location_details'])) {
                    $validator->errors()->add('name', 'Provide at least one field to update.');
                }
            },
        ];
    }
}
