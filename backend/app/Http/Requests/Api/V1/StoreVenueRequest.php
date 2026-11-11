<?php

namespace App\Http\Requests\Api\V1;

use App\Models\User;
use App\Models\Venue;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreVenueRequest extends FormRequest
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
        return [
            'name' => ['required', 'string', 'max:150', static::uniqueNameRule()],
            'location_details' => ['nullable', 'string', 'max:500'],
        ];
    }

    /** Venue names are unique ignoring case. */
    public static function uniqueNameRule(?int $ignoreVenueId = null): Closure
    {
        return static function (string $attribute, mixed $value, Closure $fail) use ($ignoreVenueId): void {
            $exists = Venue::query()
                ->whereRaw('lower(name) = ?', [mb_strtolower((string) $value)])
                ->when($ignoreVenueId !== null, fn ($query) => $query->whereKeyNot($ignoreVenueId))
                ->exists();

            if ($exists) {
                $fail('A venue with this name already exists.');
            }
        };
    }
}
