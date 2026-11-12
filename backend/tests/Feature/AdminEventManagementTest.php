<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventChangeLog;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminEventManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrator_creates_a_draft_event_and_audit_record(): void
    {
        $administrator = User::factory()->administrator()->create();
        $venue = $this->createVenue();
        Sanctum::actingAs($administrator);

        $response = $this->postJson('/api/v1/admin/events', [
            'venue_id' => $venue->id,
            'name' => 'Foundation Week',
            'description' => 'Campus event',
            'starts_at' => now()->addDays(2)->toIso8601String(),
            'ends_at' => now()->addDays(2)->addHours(4)->toIso8601String(),
        ])->assertCreated()
            ->assertJsonPath('venue_id', $venue->id)
            ->assertJsonPath('name', 'Foundation Week')
            ->assertJsonPath('status', Event::STATUS_DRAFT)
            ->assertJsonPath('configuration_version', 1);

        $this->assertDatabaseHas('event_change_logs', [
            'event_id' => $response->json('id'),
            'actor_user_id' => $administrator->id,
            'change_type' => 'event_created',
            'configuration_version' => 1,
        ]);
    }

    public function test_non_administrator_cannot_create_an_event(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/admin/events', [])->assertForbidden();
    }

    public function test_event_creation_rejects_an_end_time_before_the_start(): void
    {
        Sanctum::actingAs(User::factory()->administrator()->create());
        $venue = $this->createVenue();

        $this->postJson('/api/v1/admin/events', [
            'venue_id' => $venue->id,
            'name' => 'Invalid event',
            'starts_at' => '2026-12-10T12:00:00+08:00',
            'ends_at' => '2026-12-10T11:59:00+08:00',
        ])->assertUnprocessable()->assertJsonValidationErrors('ends_at');

        $this->assertDatabaseCount('events', 0);
        $this->assertDatabaseCount('event_change_logs', 0);
    }

    public function test_rescheduling_a_scheduled_event_requires_a_reason_and_records_the_change(): void
    {
        $administrator = User::factory()->administrator()->create();
        $event = $this->createEvent(Event::STATUS_SCHEDULED);
        Sanctum::actingAs($administrator);
        $newStart = now()->addDays(2)->addHour()->toIso8601String();

        $this->patchJson('/api/v1/admin/events/'.$event->id, [
            'starts_at' => $newStart,
        ])->assertUnprocessable()->assertJsonValidationErrors('reason');

        $this->assertSame(1, $event->fresh()->configuration_version);
        $this->assertSame(0, EventChangeLog::query()->count());

        $this->patchJson('/api/v1/admin/events/'.$event->id, [
            'starts_at' => $newStart,
            'reason' => 'Venue access changed',
        ])->assertOk()
            ->assertJsonPath('configuration_version', 2)
            ->assertJsonPath('starts_at', $newStart);

        $this->assertDatabaseHas('event_change_logs', [
            'event_id' => $event->id,
            'actor_user_id' => $administrator->id,
            'change_type' => 'schedule_changed',
            'reason' => 'Venue access changed',
            'configuration_version' => 2,
        ]);
    }

    public function test_invalid_status_transition_does_not_change_the_event(): void
    {
        $event = $this->createEvent(Event::STATUS_SCHEDULED);
        Sanctum::actingAs(User::factory()->administrator()->create());

        $this->patchJson('/api/v1/admin/events/'.$event->id, [
            'status' => Event::STATUS_COMPLETED,
        ])->assertUnprocessable()->assertJsonValidationErrors('status');

        $this->assertSame(Event::STATUS_SCHEDULED, $event->fresh()->status);
        $this->assertSame(1, $event->fresh()->configuration_version);
    }

    public function test_cancelled_and_completed_events_cannot_be_edited(): void
    {
        Sanctum::actingAs(User::factory()->administrator()->create());

        foreach ([Event::STATUS_CANCELLED, Event::STATUS_COMPLETED] as $status) {
            $event = $this->createEvent($status);

            $this->patchJson('/api/v1/admin/events/'.$event->id, [
                'name' => 'Changed name',
            ])->assertUnprocessable()->assertJsonValidationErrors('status');

            $this->assertSame('Test event', $event->fresh()->name);
            $this->assertSame(1, $event->fresh()->configuration_version);
        }
    }

    public function test_no_op_event_update_does_not_increment_the_configuration_version(): void
    {
        $event = $this->createEvent();
        Sanctum::actingAs(User::factory()->administrator()->create());

        $this->patchJson('/api/v1/admin/events/'.$event->id, [
            'name' => $event->name,
        ])->assertOk()->assertJsonPath('configuration_version', 1);

        $this->assertSame(0, EventChangeLog::query()->count());
    }

    public function test_event_list_and_detail_include_venue_and_gate_configuration(): void
    {
        $administrator = User::factory()->administrator()->create();
        $event = $this->createEvent();
        Sanctum::actingAs($administrator);

        $this->getJson('/api/v1/admin/events')
            ->assertOk()
            ->assertJsonPath('events.0.id', $event->id)
            ->assertJsonPath('events.0.venue.name', $event->venue->name);

        $this->getJson('/api/v1/admin/events/'.$event->id)
            ->assertOk()
            ->assertJsonPath('id', $event->id)
            ->assertJsonPath('event_gates', []);
    }

    private function createVenue(): Venue
    {
        return Venue::query()->create([
            'name' => 'Test Venue',
            'location_details' => 'Campus',
        ]);
    }

    private function createEvent(string $status = Event::STATUS_DRAFT): Event
    {
        $venue = $this->createVenue();

        return Event::query()->create([
            'venue_id' => $venue->id,
            'name' => 'Test event',
            'description' => null,
            'starts_at' => now()->addDays(2),
            'ends_at' => now()->addDays(2)->addHours(3),
            'status' => $status,
            'configuration_version' => 1,
        ]);
    }
}
