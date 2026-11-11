<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsEventFixtures;
use Tests\TestCase;

class AdminTicketStudentDetailsTest extends TestCase
{
    use BuildsEventFixtures, RefreshDatabase;

    public function test_issuing_listing_and_revoking_show_the_students_registered_name_and_email(): void
    {
        $fixture = $this->makeEventFixture();
        $student = User::factory()->create([
            'name' => 'Ana Reyes',
            'email' => 'ana.reyes@student.mseuf.edu.ph',
            'student_number' => 'A12-34567',
        ]);
        $token = $this->adminToken();
        $base = '/api/v1/admin/events/'.$fixture['event']->id.'/tickets';

        $issued = $this->withToken($token)->postJson($base, [
            'student_number' => 'A12-34567',
            'event_gate_id' => $fixture['eventGate']->id,
        ])->assertCreated();

        $issued->assertJsonPath('ticket.student_number', 'A12-34567')
            ->assertJsonPath('ticket.student_name', 'Ana Reyes')
            ->assertJsonPath('ticket.student_email', 'ana.reyes@student.mseuf.edu.ph');
        $this->assertArrayNotHasKey('totp_secret', $issued->json('ticket'));

        $this->withToken($token)->getJson($base)
            ->assertOk()
            ->assertJsonPath('data.0.student.id', $student->id)
            ->assertJsonPath('data.0.student.name', 'Ana Reyes')
            ->assertJsonPath('data.0.student.student_number', 'A12-34567')
            ->assertJsonPath('data.0.student.email', 'ana.reyes@student.mseuf.edu.ph');

        $this->withToken($token)->patchJson($base.'/'.$issued->json('ticket.id').'/revoke', ['reason' => 'Test'])
            ->assertOk()
            ->assertJsonPath('ticket.student.email', 'ana.reyes@student.mseuf.edu.ph')
            ->assertJsonPath('ticket.student.name', 'Ana Reyes');
    }
}
