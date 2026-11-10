<?php

namespace App\Http\Resources\Api\V1;

use App\Models\EventGate;
use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GateManifestResource extends JsonResource
{
    public static $wrap = null;

    /**
     * Event times and generated_at are ISO 8601 strings. generated_at is server
     * time; the scanner measures manifest age with its own clock.
     *
     * @return array{gate_id: int, event_status: string, manifest_version: int, event_starts_at: string, event_ends_at: string, generated_at: string, tickets: array<int, array{ticket_id: int, student_number: string|null, totp_secret: string, gate_id: int, status: string}>}
     */
    public function toArray(Request $request): array
    {
        /** @var EventGate $eventGate */
        $eventGate = $this->resource;
        $event = $eventGate->event;

        return [
            'gate_id' => $eventGate->getKey(),
            'event_status' => $event->status,
            'manifest_version' => $event->configuration_version,
            'event_starts_at' => $event->starts_at->toIso8601String(),
            'event_ends_at' => $event->ends_at->toIso8601String(),
            'generated_at' => now()->toIso8601String(),
            'tickets' => $eventGate->tickets
                ->map(function (Ticket $ticket): array {
                    return [
                        'ticket_id' => $ticket->getKey(),
                        'student_number' => $ticket->user?->student_number,
                        'totp_secret' => $ticket->totp_secret,
                        'gate_id' => $ticket->event_gate_id,
                        'status' => $ticket->status === Ticket::STATUS_ISSUED
                            ? 'unclaimed'
                            : 'claimed',
                    ];
                })
                ->all(),
        ];
    }
}
