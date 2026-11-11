<?php

namespace App\Http\Resources\Api\V1;

use App\Models\VenueGate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VenueGateResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var VenueGate $gate */
        $gate = $this->resource;

        return [
            'id' => $gate->getKey(),
            'code' => $gate->code,
            'name' => $gate->name,
        ];
    }
}
