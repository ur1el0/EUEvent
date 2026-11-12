<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventGate;
use App\Models\EventGateStaffAssignment;
use App\Models\ScanLog;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueGate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminEventGateAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_draft_gate_setup_saves_capacity_staff_and_audit_history(): void
    {
        $administrator = User::factory()->administrator()->create();
        $staff = User::factory()->securityStaff()->create();
        $event = $this->createEvent();
        $gate = $this->createVenueGate($event->venue_id, 'NORTH');
        Sanctum::actingAs($administrator);

        $this->putJson('/api/v1/admin/events/'.$event->id.'/gates', [
            'gates' => [[
                'venue_gate_id' => $gate->id,
                'capacity' => 120,
                'security_staff_ids' => [$staff->id],
            ]],
        ])->assertOk()
            ->assertJsonPath('configuration_version', 2)
            ->assertJsonPath('event_gates.0.venue_gate_id', $gate->id)
            ->assertJsonPath('event_gates.0.capacity', 120)
            ->assertJsonPath('event_gates.0.security_staff.0.id', $staff->id);

        $this->assertDatabaseHas('event_gate_staff_assignments', [
            'event_gate_id' => EventGate::query()->firstOrFail()->id,
            'user_id' => $staff->id,
        ]);
        $this->assertDatabaseHas('event_change_logs', [
            'event_id' => $event->id,
            'actor_user_id' => $administrator->id,
            'change_type' => 'gate_assignments_changed',
            'configuration_version' => 2,
        ]);
    }

    public function test_gate_setup_rejects_gates_from_another_venue_and_non_staff_accounts(): void
    {
        $administrator = User::factory()->administrator()->create();
        $event = $this->createEvent();
        $otherVenue = $this->createVenue();
        $foreignGate = $this->createVenueGate($otherVenue->id, 'FOREIGN');
        $student = User::factory()->create();
        Sanctum::actingAs($administrator);

        $this->putJson('/api/v1/admin/events/'.$event->id.'/gates', [
            'gates' => [[
                'venue_gate_id' => $foreignGate->id,
                'capacity' => 20,
                'security_staff_ids' => [],
            ]],
        ])->assertUnprocessable()->assertJsonValidationErrors('gates.0.venue_gate_id');

        $gate = $this->createVenueGate($event->venue_id, 'LOCAL');
        $this->putJson('/api/v1/admin/events/'.$event->id.'/gates', [
            'gates' => [[
                'venue_gate_id' => $gate->id,
                'capacity' => 20,
                'security_staff_ids' => [$student->id],
            ]],
        ])->assertUnprocessable()->assertJsonValidationErrors('gates.0.security_staff_ids.0');

        $this->assertDatabaseCount('event_gates', 0);
    }

    public function test_scheduled_event_can_add_a_gate_with_a_reason_but_cannot_drop_existing_gates(): void
    {
        $administrator = User::factory()->administrator()->create();
        $staff = User::factory()->securityStaff()->create();
        $event = $this->createEvent(Event::STATUS_SCHEDULED);
        $existingGate = $this->createVenueGate($event->venue_id, 'EXISTING');
        $addedGate = $this->createVenueGate($event->venue_id, 'ADDED');
        $existingEventGate = $this->createEventGate($event, $existingGate, 50);
        EventGateStaffAssignment::query()->create([
            'event_gate_id' => $existingEventGate->id,
            'user_id' => $staff->id,
        ]);
        Sanctum::actingAs($administrator);

        $desired = [
            ['venue_gate_id' => $existingGate->id, 'capacity' => 50, 'security_staff_ids' => [$staff->id]],
            ['venue_gate_id' => $addedGate->id, 'capacity' => 60, 'security_staff_ids' => []],
        ];

        $this->putJson('/api/v1/admin/events/'.$event->id.'/gates', [
            'gates' => $desired,
        ])->assertUnprocessable()->assertJsonValidationErrors('reason');

        $this->putJson('/api/v1/admin/events/'.$event->id.'/gates', [
            'gates' => $desired,
            'reason' => 'Adding an overflow entrance',
        ])->assertOk()->assertJsonCount(2, 'event_gates');

        $this->putJson('/api/v1/admin/events/'.$event->id.'/gates', [
            'gates' => [$desired[1]],
            'reason' => 'Attempt to remove the original gate',
        ])->assertUnprocessable()->assertJsonValidationErrors('gates');

        $this->assertDatabaseHas('event_gates', ['id' => $existingEventGate->id]);
    }

    public function test_scheduled_gate_assignment_cannot_remove_existing_scanner_access(): void
    {
        $administrator = User::factory()->administrator()->create();
        $staff = User::factory()->securityStaff()->create();
        $event = $this->createEvent(Event::STATUS_SCHEDULED);
        $gate = $this->createVenueGate($event->venue_id, 'STAFFED');
        $eventGate = $this->createEventGate($event, $gate, 80);
        EventGateStaffAssignment::query()->create([
            'event_gate_id' => $eventGate->id,
            'user_id' => $staff->id,
        ]);
        Sanctum::actingAs($administrator);

        $this->putJson('/api/v1/admin/events/'.$event->id.'/gates', [
            'gates' => [[
                'venue_gate_id' => $gate->id,
                'capacity' => 80,
                'security_staff_ids' => [],
            ]],
            'reason' => 'Attempt to revoke scanner assignment',
        ])->assertUnprocessable()->assertJsonValidationErrors('gates');

        $this->assertDatabaseHas('event_gate_staff_assignments', [
            'event_gate_id' => $eventGate->id,
            'user_id' => $staff->id,
        ]);
    }

    public function test_capacity_cannot_be_reduced_below_admissions_already_synced(): void
    {
        $administrator = User::factory()->administrator()->create();
        $event = $this->createEvent(Event::STATUS_SCHEDULED);
        $gate = $this->createVenueGate($event->venue_id, 'CAPACITY');
        $eventGate = $this->createEventGate($event, $gate, 5);

        for ($index = 0; $index < 2; $index++) {
            $student = User::factory()->create();
            $ticket = Ticket::query()->create([
                'user_id' => $student->id,
                'event_gate_id' => $eventGate->id,
                'totp_secret' => str_repeat('a', 40),
                'status' => Ticket::STATUS_CLAIMED,
            ]);
            ScanLog::query()->create([
                'scan_id' => (string) Str::uuid(),
                'ticket_id' => $ticket->id,
                'event_gate_id' => $eventGate->id,
                'scanned_by_user_id' => $administrator->id,
                'device_id' => 'test-device',
                'device_scanned_at' => now(),
                'event_configuration_version' => 1,
                'is_override' => false,
                'decision' => 'accepted',
            ]);
        }
        Sanctum::actingAs($administrator);

        $this->putJson('/api/v1/admin/events/'.$event->id.'/gates', [
            'gates' => [[
                'venue_gate_id' => $gate->id,
                'capacity' => 1,
                'security_staff_ids' => [],
            ]],
            'reason' => 'Attempted reduction below admissions',
        ])->assertUnprocessable()->assertJsonValidationErrors('gates');

        $this->assertSame(5, $eventGate->fresh()->capacity);
    }

    public function test_cancelled_event_gate_configuration_is_frozen(): void
    {
        $administrator = User::factory()->administrator()->create();
        $event = $this->createEvent(Event::STATUS_CANCELLED);
        $gate = $this->createVenueGate($event->venue_id, 'FROZEN');
        $eventGate = $this->createEventGate($event, $gate, 50);
        Sanctum::actingAs($administrator);

        $this->putJson('/api/v1/admin/events/'.$event->id.'/gates', [
            'gates' => [[
                'venue_gate_id' => $gate->id,
                'capacity' => 75,
                'security_staff_ids' => [],
            ]],
        ])->assertUnprocessable()->assertJsonValidationErrors('gates');

        $this->assertSame(50, $eventGate->fresh()->capacity);
    }

    private function createVenue(): Venue
    {
        return Venue::query()->create(['name' => 'Test Venue', 'location_details' => null]);
    }

    private function createEvent(string $status = Event::STATUS_DRAFT): Event
    {
        $venue = $this->createVenue();

        return Event::query()->create([
            'venue_id' => $venue->id,
            'name' => 'Gate test event',
            'description' => null,
            'starts_at' => now()->addDay(),
            'ends_at' => now()->addDay()->addHours(3),
            'status' => $status,
            'configuration_version' => 1,
        ]);
    }

    private function createVenueGate(int $venueId, string $code): VenueGate
    {
        return VenueGate::query()->create([
            'venue_id' => $venueId,
            'code' => $code,
            'name' => $code.' Gate',
        ]);
    }

    private function createEventGate(Event $event, VenueGate $gate, int $capacity): EventGate
    {
        return EventGate::query()->create([
            'event_id' => $event->id,
            'venue_gate_id' => $gate->id,
            'capacity' => $capacity,
        ]);
    }
}
