<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\RequestMobilePasswordResetLinkRequest;
use App\Http\Requests\Api\V1\ResetMobilePasswordRequest;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Throwable;

class MobilePasswordResetController extends Controller
{
    public function sendLink(RequestMobilePasswordResetLinkRequest $request): JsonResponse
    {
        $email = $request->validated()['email'];
        $eligibleAccountExists = User::query()
            ->where('email', $email)
            ->whereIn('role', [User::ROLE_STUDENT, User::ROLE_SECURITY_STAFF])
            ->exists();

        if ($eligibleAccountExists) {
            try {
                Password::sendResetLink(['email' => $email]);
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        return response()->json([
            'message' => 'If an eligible account uses that email, a password reset token will be sent.',
        ], 202);
    }

    public function reset(ResetMobilePasswordRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $eligibleAccountExists = User::query()
            ->where('email', $validated['email'])
            ->whereIn('role', [User::ROLE_STUDENT, User::ROLE_SECURITY_STAFF])
            ->exists();

        if (! $eligibleAccountExists) {
            return response()->json([
                'message' => 'The password reset token is invalid or expired. Request a new token and try again.',
            ], 422);
        }

        $status = Password::reset($validated, function (User $user, string $password): void {
            $user->forceFill([
                'password' => $password,
            ]);
            $user->setRememberToken(Str::random(60));
            $user->save();

            $user->tokens()->delete();

            event(new PasswordReset($user));
        });

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'The password reset token is invalid or expired. Request a new token and try again.',
            ], 422);
        }

        return response()->json([
            'message' => 'Password updated. Sign in again with your new password.',
        ]);
    }
}
