<?php

namespace App\Http\Requests\Api\V1;

use App\Models\User;
use App\Models\Venue;
use App\Models\VenueGate;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreVenueGateRequest extends FormRequest
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

        return [
            'code' => ['required', 'string', 'max:32', static::uniqueCodeRule($venue instanceof Venue ? $venue->getKey() : 0)],
            'name' => ['required', 'string', 'max:120'],
        ];
    }

    /** A gate code is unique within its venue, ignoring case. */
    public static function uniqueCodeRule(int $venueId, ?int $ignoreGateId = null): Closure
    {
        return static function (string $attribute, mixed $value, Closure $fail) use ($venueId, $ignoreGateId): void {
            $exists = VenueGate::query()
                ->where('venue_id', $venueId)
                ->whereRaw('lower(code) = ?', [mb_strtolower((string) $value)])
                ->when($ignoreGateId !== null, fn ($query) => $query->whereKeyNot($ignoreGateId))
                ->exists();

            if ($exists) {
                $fail('This venue already has a gate with this code.');
            }
        };
    }
}
