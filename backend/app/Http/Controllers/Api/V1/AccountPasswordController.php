<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ChangeAccountPasswordRequest;
use App\Models\User;
use App\Services\AccountPasswordChangeService;
use Illuminate\Http\JsonResponse;
use Laravel\Sanctum\PersonalAccessToken;

class AccountPasswordController extends Controller
{
    public function __invoke(
        ChangeAccountPasswordRequest $request,
        AccountPasswordChangeService $passwordChangeService,
    ): JsonResponse {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $currentToken = $user->currentAccessToken();

        $passwordChangeService->change(
            $user,
            $request->validated()['password'],
            $currentToken instanceof PersonalAccessToken ? $currentToken->getKey() : null,
        );

        return response()->json([
            'message' => 'Password updated. Other signed-in sessions were signed out.',
        ]);
    }
}
