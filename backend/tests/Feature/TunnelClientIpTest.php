<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class TunnelClientIpTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_throttle_is_per_phone_when_requests_arrive_through_a_local_tunnel(): void
    {
        foreach (range(1, 8) as $phone) {
            $this->failedLoginFrom('127.0.0.1', '203.0.113.'.$phone)
                ->assertUnauthorized();
        }
    }

    public function test_login_throttle_still_applies_to_one_phone_behind_a_local_tunnel(): void
    {
        foreach (range(1, 6) as $attempt) {
            $this->failedLoginFrom('127.0.0.1', '203.0.113.50')->assertUnauthorized();
        }

        $this->failedLoginFrom('127.0.0.1', '203.0.113.50')->assertTooManyRequests();
    }

    public function test_remote_clients_cannot_bypass_the_throttle_with_a_forged_forwarded_header(): void
    {
        foreach (range(1, 6) as $attempt) {
            $this->failedLoginFrom('198.51.100.7', '203.0.113.'.$attempt)->assertUnauthorized();
        }

        $this->failedLoginFrom('198.51.100.7', '203.0.113.99')->assertTooManyRequests();
    }

    private function failedLoginFrom(string $remoteAddress, string $forwardedFor): TestResponse
    {
        return $this->withServerVariables(['REMOTE_ADDR' => $remoteAddress])
            ->withHeader('X-Forwarded-For', $forwardedFor)
            ->postJson('/api/v1/auth/login', [
                'identifier' => 'nobody@example.com',
                'password' => 'wrong-password',
            ]);
    }
}
