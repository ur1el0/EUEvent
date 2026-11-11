<?php

namespace Tests\Feature;

use App\Models\AdminActivityLog;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueGate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\BuildsEventFixtures;
use Tests\TestCase;

class AdminVenueEndpointsTest extends TestCase
{
    use BuildsEventFixtures, RefreshDatabase;

    /** @return array<string, array{0: string, 1: string, 2: array<string, string>}> */
    public static function venueRoutes(): array
    {
        // {venue} and {gate} are replaced with real ids below; route binding runs before the role check.
        return [
            'list venues' => ['getJson', '/api/v1/admin/venues', []],
            'create venue' => ['postJson', '/api/v1/admin/venues', ['name' => 'X']],
            'update venue' => ['patchJson', '/api/v1/admin/venues/{venue}', ['name' => 'X']],
            'create gate' => ['postJson', '/api/v1/admin/venues/{venue}/gates', ['code' => 'A', 'name' => 'Gate']],
            'update gate' => ['patchJson', '/api/v1/admin/venues/{venue}/gates/{gate}', ['name' => 'Gate']],
        ];
    }

    /** @param array<string, string> $payload */
    #[DataProvider('venueRoutes')]
    public function test_only_administrators_can_use_venue_endpoints(string $method, string $uri, array $payload): void
    {
        $fixture = $this->makeEventFixture();
        $uri = str_replace(['{venue}', '{gate}'], [(string) $fixture['venue']->id, (string) $fixture['venueGate']->id], $uri);

        $this->{$method}($uri, $payload)->assertUnauthorized();

        foreach ([User::factory()->create(), User::factory()->securityStaff()->create()] as $user) {
            Auth::forgetGuards();
            $this->withToken($user->createToken('t')->plainTextToken)->{$method}($uri, $payload)->assertForbidden();
        }
    }

    public function test_index_lists_venues_with_their_gates(): void
    {
        $fixture = $this->makeEventFixture(venueName: 'Main Gym');

        $this->withToken($this->adminToken())->getJson('/api/v1/admin/venues')
            ->assertOk()
            ->assertExactJson(['venues' => [[
                'id' => $fixture['venue']->id,
                'name' => 'Main Gym',
                'location_details' => null,
                'gates' => [['id' => $fixture['venueGate']->id, 'code' => 'A', 'name' => 'Gate A']],
            ]]]);
    }

    public function test_creating_a_venue_returns_it_logs_it_and_shows_in_event_options(): void
    {
        $admin = User::factory()->administrator()->create();
        $token = $this->adminToken($admin);

        $this->withToken($token)->postJson('/api/v1/admin/venues', ['name' => '  Sports Field ', 'location_details' => ' Behind the gym '])
            ->assertCreated()
            ->assertJsonPath('name', 'Sports Field')
            ->assertJsonPath('location_details', 'Behind the gym')
            ->assertJsonPath('gates', []);

        $this->assertDatabaseHas('admin_activity_logs', [
            'actor_user_id' => $admin->id,
            'action' => AdminActivityLog::ACTION_VENUE_CREATED,
            'subject_label' => 'Sports Field',
        ]);
        $this->withToken($token)->getJson('/api/v1/admin/event-options')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Sports Field']);
    }

    public function test_creating_a_venue_validates_input_and_rejects_duplicate_names_ignoring_case(): void
    {
        Venue::query()->create(['name' => 'University Gym']);
        $token = $this->adminToken();

        $this->withToken($token)->postJson('/api/v1/admin/venues', [])->assertJsonValidationErrors('name');
        $this->withToken($token)->postJson('/api/v1/admin/venues', ['name' => str_repeat('a', 151)])->assertJsonValidationErrors('name');
        $this->withToken($token)->postJson('/api/v1/admin/venues', ['name' => 'university GYM'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
        $this->assertDatabaseCount('venues', 1);
    }

    public function test_updating_a_venue_changes_only_the_given_fields_and_logs_real_changes(): void
    {
        $venue = Venue::query()->create(['name' => 'Old Name', 'location_details' => 'Old place']);
        $token = $this->adminToken();

        $this->withToken($token)->patchJson('/api/v1/admin/venues/'.$venue->id, ['location_details' => 'New place'])
            ->assertOk()
            ->assertJsonPath('name', 'Old Name')
            ->assertJsonPath('location_details', 'New place');
        $this->withToken($token)->patchJson('/api/v1/admin/venues/'.$venue->id, ['location_details' => 'New place'])->assertOk();

        $this->assertSame(1, AdminActivityLog::query()->where('action', AdminActivityLog::ACTION_VENUE_UPDATED)->count());
    }

    public function test_updating_a_venue_needs_a_field_and_keeps_names_unique(): void
    {
        $venue = Venue::query()->create(['name' => 'First']);
        Venue::query()->create(['name' => 'Second']);
        $token = $this->adminToken();

        $this->withToken($token)->patchJson('/api/v1/admin/venues/'.$venue->id, [])->assertUnprocessable();
        $this->withToken($token)->patchJson('/api/v1/admin/venues/'.$venue->id, ['name' => 'SECOND'])->assertJsonValidationErrors('name');
        $this->withToken($token)->patchJson('/api/v1/admin/venues/'.$venue->id, ['name' => 'FIRST'])->assertOk()->assertJsonPath('name', 'FIRST');
        $this->withToken($token)->patchJson('/api/v1/admin/venues/9999', ['name' => 'Third'])->assertNotFound();
    }

    public function test_creating_a_gate_returns_it_and_enforces_codes_per_venue(): void
    {
        $fixture = $this->makeEventFixture();
        $other = Venue::query()->create(['name' => 'Other Venue']);
        $token = $this->adminToken();
        $url = '/api/v1/admin/venues/'.$fixture['venue']->id.'/gates';

        $response = $this->withToken($token)->postJson($url, ['code' => ' B ', 'name' => 'Gate B'])
            ->assertCreated()
            ->assertJsonPath('code', 'B')
            ->assertJsonPath('name', 'Gate B');
        $this->assertDatabaseHas('venue_gates', ['id' => $response->json('id'), 'venue_id' => $fixture['venue']->id]);
        $this->assertDatabaseHas('admin_activity_logs', ['action' => AdminActivityLog::ACTION_VENUE_GATE_CREATED]);

        $this->withToken($token)->postJson($url, ['code' => 'b', 'name' => 'Duplicate'])->assertJsonValidationErrors('code');
        $this->withToken($token)->postJson($url, ['name' => 'No code'])->assertJsonValidationErrors('code');
        $this->withToken($token)->postJson('/api/v1/admin/venues/'.$other->id.'/gates', ['code' => 'B', 'name' => 'Same code, other venue'])->assertCreated();
        $this->withToken($token)->postJson('/api/v1/admin/venues/9999/gates', ['code' => 'Z', 'name' => 'Nowhere'])->assertNotFound();
    }

    public function test_updating_a_gate_keeps_its_id_and_the_events_that_use_it(): void
    {
        $fixture = $this->makeEventFixture();
        $other = Venue::query()->create(['name' => 'Other Venue']);
        $otherGate = VenueGate::query()->create(['venue_id' => $other->id, 'code' => 'Q', 'name' => 'Other gate']);
        $token = $this->adminToken();
        $url = '/api/v1/admin/venues/'.$fixture['venue']->id.'/gates/'.$fixture['venueGate']->id;

        $this->withToken($token)->patchJson($url, ['name' => 'Renamed gate'])
            ->assertOk()
            ->assertJsonPath('id', $fixture['venueGate']->id)
            ->assertJsonPath('code', 'A')
            ->assertJsonPath('name', 'Renamed gate');
        $this->withToken($token)->patchJson($url, ['code' => 'A2'])->assertOk()->assertJsonPath('code', 'A2');
        $this->withToken($token)->patchJson($url, [])->assertUnprocessable();

        $this->assertSame($fixture['venueGate']->id, $fixture['eventGate']->fresh()->venue_gate_id);
        $this->withToken($token)->patchJson('/api/v1/admin/venues/'.$fixture['venue']->id.'/gates/'.$otherGate->id, ['name' => 'Hijack'])->assertNotFound();
        $this->assertSame('Other gate', $otherGate->fresh()->name);
    }

    public function test_a_gate_code_cannot_be_changed_to_one_already_used_in_the_venue(): void
    {
        $fixture = $this->makeEventFixture();
        $second = VenueGate::query()->create(['venue_id' => $fixture['venue']->id, 'code' => 'B', 'name' => 'Gate B']);
        $url = '/api/v1/admin/venues/'.$fixture['venue']->id.'/gates/'.$second->id;

        $this->withToken($this->adminToken())->patchJson($url, ['code' => 'a'])->assertJsonValidationErrors('code');
        $this->withToken($this->adminToken())->patchJson($url, ['code' => 'B'])->assertOk();
    }

    public function test_venues_and_gates_cannot_be_deleted(): void
    {
        $fixture = $this->makeEventFixture();
        $token = $this->adminToken();

        foreach (['/api/v1/admin/venues/'.$fixture['venue']->id, '/api/v1/admin/venues/'.$fixture['venue']->id.'/gates/'.$fixture['venueGate']->id] as $url) {
            $this->assertContains($this->withToken($token)->deleteJson($url)->status(), [404, 405]);
        }
        $this->assertDatabaseCount('venues', 1);
        $this->assertDatabaseCount('venue_gates', 1);
    }
}
