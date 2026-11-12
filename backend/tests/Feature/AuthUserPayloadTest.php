<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AuthUserPayloadTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{0: string}>
     */
    public static function roles(): array
    {
        return [
            'student' => ['student'],
            'security staff' => ['security_staff'],
            'administrator' => ['administrator'],
        ];
    }

    #[DataProvider('roles')]
    public function test_login_returns_the_user_email_without_secrets(string $role): void
    {
        $user = $this->makeUser($role);

        $response = $this->postJson('/api/v1/auth/login', [
            'identifier' => $role === 'student' ? $user->student_number : $user->email,
            'password' => 'CorrectHorse123!',
        ])->assertOk();

        $response->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.name', $user->name)
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonPath('user.role', $role)
            ->assertJsonPath('user.student_number', $user->student_number);
        $this->assertUserPayloadHasNoSecrets($response->json('user'));
        $this->assertNotEmpty($response->json('token'));
    }

    #[DataProvider('roles')]
    public function test_auth_me_returns_the_user_email_without_secrets(string $role): void
    {
        $user = $this->makeUser($role);
        $token = $user->createToken('test-device')->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/v1/auth/me')->assertOk();

        $response->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonPath('user.role', $role);
        $this->assertUserPayloadHasNoSecrets($response->json('user'));
        $this->assertArrayNotHasKey('token', $response->json());
    }

    private function makeUser(string $role): User
    {
        $factory = match ($role) {
            'security_staff' => User::factory()->securityStaff(),
            'administrator' => User::factory()->administrator(),
            default => User::factory(),
        };

        return $factory->create([
            'email' => $role.'@euevent.test',
            'password' => 'CorrectHorse123!',
        ]);
    }

    /**
     * @param  array<string, mixed>  $user
     */
    private function assertUserPayloadHasNoSecrets(array $user): void
    {
        $this->assertEqualsCanonicalizing(
            ['id', 'student_number', 'name', 'email', 'role'],
            array_keys($user),
        );

        foreach (['password', 'remember_token', 'token', 'tokens'] as $forbidden) {
            $this->assertArrayNotHasKey($forbidden, $user);
        }
    }
}
