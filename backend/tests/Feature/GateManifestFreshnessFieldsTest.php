<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventGate;
use App\Models\EventGateStaffAssignment;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueGate;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GateManifestFreshnessFieldsTest extends TestCase
{
    use RefreshDatabase;

    public function test_manifest_includes_event_window_and_server_generation_time(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-20T08:15:30+00:00'));
        [$staff, $eventGate] = $this->assignedGate(
            CarbonImmutable::parse('2026-11-20T09:00:00+00:00'),
            CarbonImmutable::parse('2026-11-20T12:30:00+00:00'),
        );
        Sanctum::actingAs($staff);

        $this->getJson("/api/v1/gates/{$eventGate->id}/manifest")
            ->assertOk()
            ->assertJsonPath('event_starts_at', '2026-11-20T09:00:00+00:00')
            ->assertJsonPath('event_ends_at', '2026-11-20T12:30:00+00:00')
            ->assertJsonPath('generated_at', '2026-11-20T08:15:30+00:00');
    }

    public function test_freshness_fields_are_added_without_removing_existing_fields(): void
    {
        [$staff, $eventGate] = $this->assignedGate(now()->addHour(), now()->addHours(4));
        Sanctum::actingAs($staff);

        $this->getJson("/api/v1/gates/{$eventGate->id}/manifest")
            ->assertOk()
            ->assertJsonStructure([
                'gate_id',
                'event_status',
                'manifest_version',
                'event_starts_at',
                'event_ends_at',
                'generated_at',
                'tickets' => [['ticket_id', 'student_number', 'totp_secret', 'gate_id', 'status']],
            ])
            ->assertJsonPath('gate_id', $eventGate->id)
            ->assertJsonPath('manifest_version', 2);
    }

    public function test_generation_time_reflects_each_download(): void
    {
        [$staff, $eventGate] = $this->assignedGate(now()->addDay(), now()->addDays(2));
        Sanctum::actingAs($staff);

        $this->travelTo(CarbonImmutable::parse('2026-11-19T07:00:00+00:00'));
        $first = $this->getJson("/api/v1/gates/{$eventGate->id}/manifest")->json('generated_at');

        $this->travelTo(CarbonImmutable::parse('2026-11-19T13:00:00+00:00'));
        $second = $this->getJson("/api/v1/gates/{$eventGate->id}/manifest")->json('generated_at');

        $this->assertSame('2026-11-19T07:00:00+00:00', $first);
        $this->assertSame('2026-11-19T13:00:00+00:00', $second);
    }

    /**
     * @return array{0: User, 1: EventGate}
     */
    private function assignedGate(\DateTimeInterface $startsAt, \DateTimeInterface $endsAt): array
    {
        $venue = Venue::query()->create(['name' => 'Test Hall', 'location_details' => null]);
        $venueGate = VenueGate::query()->create([
            'venue_id' => $venue->id,
            'code' => 'NORTH',
            'name' => 'North Gate',
        ]);
        $event = Event::query()->create([
            'venue_id' => $venue->id,
            'name' => 'Freshness Event',
            'description' => null,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => Event::STATUS_SCHEDULED,
            'configuration_version' => 2,
        ]);
        $eventGate = EventGate::query()->create([
            'event_id' => $event->id,
            'venue_gate_id' => $venueGate->id,
            'capacity' => 100,
        ]);
        $staff = User::factory()->securityStaff()->create();
        EventGateStaffAssignment::query()->create([
            'event_gate_id' => $eventGate->id,
            'user_id' => $staff->id,
        ]);
        Ticket::query()->create([
            'user_id' => User::factory()->create()->id,
            'event_gate_id' => $eventGate->id,
            'totp_secret' => str_repeat('c', 40),
            'status' => Ticket::STATUS_ISSUED,
        ]);

        return [$staff, $eventGate];
    }
}
