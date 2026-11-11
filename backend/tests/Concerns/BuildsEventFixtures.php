<?php

namespace Tests\Concerns;

use App\Models\Event;
use App\Models\EventGate;
use App\Models\EventGateStaffAssignment;
use App\Models\ScanLog;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueGate;
use Illuminate\Support\Str;

trait BuildsEventFixtures
{
    /** @return array{venue: Venue, venueGate: VenueGate, event: Event, eventGate: EventGate} */
    protected function makeEventFixture(string $status = Event::STATUS_SCHEDULED, string $venueName = 'Fixture Hall'): array
    {
        $venue = Venue::query()->create(['name' => $venueName, 'location_details' => null]);
        $venueGate = VenueGate::query()->create(['venue_id' => $venue->id, 'code' => 'A', 'name' => 'Gate A']);
        $event = Event::query()->create([
            'venue_id' => $venue->id,
            'name' => 'Fixture Event',
            'description' => null,
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addHours(3),
            'status' => $status,
            'configuration_version' => 1,
        ]);
        $eventGate = EventGate::query()->create([
            'event_id' => $event->id,
            'venue_gate_id' => $venueGate->id,
            'capacity' => 50,
        ]);

        return compact('venue', 'venueGate', 'event', 'eventGate');
    }

    protected function assignStaff(EventGate $eventGate, User $staff): EventGateStaffAssignment
    {
        return EventGateStaffAssignment::query()->create([
            'event_gate_id' => $eventGate->id,
            'user_id' => $staff->id,
        ]);
    }

    protected function issueTicket(EventGate $eventGate, User $student, string $status = Ticket::STATUS_ISSUED): Ticket
    {
        return Ticket::query()->create([
            'user_id' => $student->id,
            'event_gate_id' => $eventGate->id,
            'totp_secret' => 'JBSWY3DPEHPK3PXP',
            'status' => $status,
        ]);
    }

    protected function recordScan(Ticket $ticket, User $staff): ScanLog
    {
        return ScanLog::query()->create([
            'scan_id' => (string) Str::uuid(),
            'ticket_id' => $ticket->id,
            'event_gate_id' => $ticket->event_gate_id,
            'scanned_by_user_id' => $staff->id,
            'device_id' => 'device-1',
            'device_scanned_at' => now(),
            'event_configuration_version' => 1,
            'is_override' => false,
            'decision' => 'accepted',
            'reason_code' => 'OK',
        ]);
    }

    protected function adminToken(?User $admin = null): string
    {
        return ($admin ?? User::factory()->administrator()->create())->createToken('admin-test')->plainTextToken;
    }
}
