<?php

namespace Tests\Feature;

use App\Models\AdminActivityLog;
use App\Models\AuditLog;
use App\Models\Event;
use App\Models\EventChangeLog;
use App\Models\EventGate;
use App\Models\ScanLog;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueGate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminDirectoryAndOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrator_creates_a_student_with_normalized_details_and_a_hashed_password(): void
    {
        $administrator = User::factory()->administrator()->create();
        Sanctum::actingAs($administrator);

        $response = $this->postJson('/api/v1/admin/students', [
            'name' => '  Sample Student  ',
            'student_number' => ' A23-45678 ',
            'email' => '  Student@MSEUF.EDU.PH ',
            'password' => 'StrongPassword123!',
            'password_confirmation' => 'StrongPassword123!',
        ])->assertCreated()
            ->assertJsonPath('student.name', 'Sample Student')
            ->assertJsonPath('student.student_number', 'A23-45678')
            ->assertJsonPath('student.email', 'student@mseuf.edu.ph')
            ->assertJsonMissingPath('student.password');

        $student = User::query()->findOrFail($response->json('student.id'));
        $this->assertSame(User::ROLE_STUDENT, $student->role);
        $this->assertTrue(Hash::check('StrongPassword123!', $student->password));
        $this->assertDatabaseHas('admin_activity_logs', [
            'actor_user_id' => $administrator->id,
            'action' => AdminActivityLog::ACTION_STUDENT_ACCOUNT_CREATED,
            'subject_id' => $student->id,
        ]);
    }

    public function test_student_directory_searches_students_only_and_returns_pagination_metadata(): void
    {
        $administrator = User::factory()->administrator()->create();
        User::factory()->create([
            'name' => 'Roosc Zano',
            'email' => 'roosc@example.edu',
            'student_number' => 'A23-00001',
        ]);
        User::factory()->create([
            'name' => 'Another Student',
            'email' => 'another@example.edu',
            'student_number' => 'A23-00002',
        ]);
        User::factory()->securityStaff()->create([
            'name' => 'Roosc Security',
            'email' => 'security@example.edu',
        ]);
        Sanctum::actingAs($administrator);

        $this->getJson('/api/v1/admin/students?search=%20A23-00001%20&per_page=1')
            ->assertOk()
            ->assertJsonCount(1, 'students')
            ->assertJsonPath('students.0.student_number', 'A23-00001')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonMissingPath('students.0.password');
    }

    public function test_only_administrators_can_open_account_directories_and_event_options(): void
    {
        Sanctum::actingAs(User::factory()->securityStaff()->create());

        $this->getJson('/api/v1/admin/students')->assertForbidden();
        $this->getJson('/api/v1/admin/security-staff')->assertForbidden();
        $this->getJson('/api/v1/admin/event-options')->assertForbidden();
        $this->getJson('/api/v1/admin/activity-logs')->assertForbidden();
        $this->getJson('/api/v1/admin/metrics')->assertForbidden();
    }

    public function test_administrator_creates_and_lists_security_staff_without_returning_passwords(): void
    {
        $administrator = User::factory()->administrator()->create();
        Sanctum::actingAs($administrator);

        $response = $this->postJson('/api/v1/admin/security-staff', [
            'name' => 'Door Staff',
            'email' => '  Door.Staff@MSEUF.EDU.PH ',
            'password' => 'StrongPassword123!',
            'password_confirmation' => 'StrongPassword123!',
        ])->assertCreated()
            ->assertJsonPath('staff.name', 'Door Staff')
            ->assertJsonPath('staff.email', 'door.staff@mseuf.edu.ph')
            ->assertJsonPath('staff.is_active', true)
            ->assertJsonMissingPath('staff.password');

        $staff = User::query()->findOrFail($response->json('staff.id'));
        $this->assertSame(User::ROLE_SECURITY_STAFF, $staff->role);
        $this->assertNull($staff->student_number);
        $this->assertTrue(Hash::check('StrongPassword123!', $staff->password));

        $this->getJson('/api/v1/admin/security-staff')
            ->assertOk()
            ->assertJsonPath('staff.0.id', $staff->id)
            ->assertJsonMissingPath('staff.0.password');
    }

    public function test_event_options_include_venue_gates_and_staff_but_not_students(): void
    {
        $administrator = User::factory()->administrator()->create();
        $venue = $this->createVenue('North Gym');
        $gate = $this->createVenueGate($venue, 'NORTH');
        $staff = User::factory()->securityStaff()->create(['name' => 'Gate Staff']);
        User::factory()->create(['name' => 'Student Account']);
        Sanctum::actingAs($administrator);

        $this->getJson('/api/v1/admin/event-options')
            ->assertOk()
            ->assertJsonPath('venues.0.id', $venue->id)
            ->assertJsonPath('venues.0.gates.0.id', $gate->id)
            ->assertJsonPath('security_staff.0.id', $staff->id)
            ->assertJsonMissing(['name' => 'Student Account']);
    }

    public function test_activity_feed_filters_types_and_returns_a_bounded_page(): void
    {
        $administrator = User::factory()->administrator()->create();
        $student = User::factory()->create();
        $venue = $this->createVenue('Activity Venue');
        $event = $this->createEvent($venue);

        AdminActivityLog::query()->create([
            'actor_user_id' => $administrator->id,
            'action' => AdminActivityLog::ACTION_STUDENT_ACCOUNT_CREATED,
            'subject_type' => 'student',
            'subject_id' => $student->id,
            'subject_label' => 'A23-00001 · Sample Student',
            'created_at' => now()->subMinute(),
        ]);
        AdminActivityLog::query()->create([
            'actor_user_id' => $administrator->id,
            'action' => AdminActivityLog::ACTION_SECURITY_STAFF_ACCOUNT_CREATED,
            'subject_type' => 'security_staff',
            'subject_id' => $student->id,
            'subject_label' => 'Gate Staff · gate@example.edu',
            'created_at' => now(),
        ]);
        EventChangeLog::query()->create([
            'event_id' => $event->id,
            'actor_user_id' => $administrator->id,
            'configuration_version' => 1,
            'change_type' => 'event_created',
            'reason' => null,
            'old_values' => null,
            'new_values' => ['name' => $event->name],
        ]);
        Sanctum::actingAs($administrator);

        $response = $this->getJson('/api/v1/admin/activity-logs?type=account&limit=1')
            ->assertOk()
            ->assertJsonPath('limit', 1)
            ->assertJsonPath('has_more', true)
            ->assertJsonCount(1, 'entries')
            ->assertJsonPath('entries.0.type', 'account')
            ->assertJsonPath('entries.0.action', AdminActivityLog::ACTION_SECURITY_STAFF_ACCOUNT_CREATED);

        $this->assertSame('no-store, private', $response->headers->get('Cache-Control'));
    }

    public function test_activity_feed_rejects_an_inverted_date_range(): void
    {
        Sanctum::actingAs(User::factory()->administrator()->create());

        $this->getJson('/api/v1/admin/activity-logs?from=2026-12-10&to=2026-12-09')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('to');
    }

    public function test_metrics_can_be_scoped_to_one_event_and_count_only_admitted_scans(): void
    {
        $administrator = User::factory()->administrator()->create();
        $venue = $this->createVenue('Metrics Venue');
        $event = $this->createEvent($venue);
        $gate = $this->createVenueGate($venue, 'METRICS');
        $eventGate = EventGate::query()->create([
            'event_id' => $event->id,
            'venue_gate_id' => $gate->id,
            'capacity' => 100,
        ]);
        $studentOne = User::factory()->create();
        $studentTwo = User::factory()->create();
        $issuedTicket = $this->createTicket($studentOne, $eventGate, Ticket::STATUS_ISSUED);
        $claimedTicket = $this->createTicket($studentTwo, $eventGate, Ticket::STATUS_CLAIMED);
        $this->createTicket(User::factory()->create(), $eventGate, Ticket::STATUS_REVOKED);
        ScanLog::query()->create([
            'scan_id' => (string) Str::uuid(),
            'ticket_id' => $claimedTicket->id,
            'event_gate_id' => $eventGate->id,
            'scanned_by_user_id' => $administrator->id,
            'device_id' => 'scanner-1',
            'device_scanned_at' => now(),
            'event_configuration_version' => 1,
            'is_override' => false,
            'decision' => 'accepted',
        ]);
        AuditLog::query()->create([
            'ticket_id' => $issuedTicket->id,
            'event_gate_id' => $eventGate->id,
            'scanned_by_user_id' => $administrator->id,
            'device_id' => 'scanner-1',
            'anomaly_type' => 'GATE_MISMATCH',
        ]);

        $otherEvent = $this->createEvent($this->createVenue('Other Metrics Venue'));
        $otherGate = $this->createVenueGate($otherEvent->venue, 'OTHER');
        $otherEventGate = EventGate::query()->create([
            'event_id' => $otherEvent->id,
            'venue_gate_id' => $otherGate->id,
            'capacity' => 25,
        ]);
        $this->createTicket(User::factory()->create(), $otherEventGate, Ticket::STATUS_ISSUED);
        Sanctum::actingAs($administrator);

        $this->getJson('/api/v1/admin/metrics?event_id='.$event->id)
            ->assertOk()
            ->assertJsonPath('total_issued', 2)
            ->assertJsonPath('total_admitted', 1)
            ->assertJsonPath('pending_sync_estimate', null)
            ->assertJsonPath('anomalies_count', 1)
            ->assertJsonPath('gates.0.gate_id', $eventGate->id)
            ->assertJsonPath('gates.0.admitted', 1)
            ->assertJsonCount(1, 'recent_anomalies')
            ->assertJsonMissingPath('recent_anomalies.0.metadata');

        $this->getJson('/api/v1/admin/metrics?event_id=999999')
            ->assertUnprocessable()->assertJsonValidationErrors('event_id');
    }

    private function createVenue(string $name): Venue
    {
        return Venue::query()->create(['name' => $name, 'location_details' => null]);
    }

    private function createVenueGate(Venue $venue, string $code): VenueGate
    {
        return VenueGate::query()->create([
            'venue_id' => $venue->id,
            'code' => $code,
            'name' => $code.' Gate',
        ]);
    }

    private function createEvent(Venue $venue): Event
    {
        return Event::query()->create([
            'venue_id' => $venue->id,
            'name' => 'Operations event',
            'description' => null,
            'starts_at' => now()->addDay(),
            'ends_at' => now()->addDay()->addHours(3),
            'status' => Event::STATUS_SCHEDULED,
            'configuration_version' => 1,
        ]);
    }

    private function createTicket(User $student, EventGate $eventGate, string $status): Ticket
    {
        return Ticket::query()->create([
            'user_id' => $student->id,
            'event_gate_id' => $eventGate->id,
            'totp_secret' => str_repeat('a', 40),
            'status' => $status,
        ]);
    }
}
