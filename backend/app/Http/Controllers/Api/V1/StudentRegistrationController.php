<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\RegisterStudentRequest;
use App\Http\Requests\Api\V1\ResendRegistrationCodeRequest;
use App\Http\Requests\Api\V1\VerifyStudentRegistrationRequest;
use App\Services\StudentRegistrationService;
use Illuminate\Http\JsonResponse;

class StudentRegistrationController extends Controller
{
    private const GENERIC_ACCEPTED = 'If this email can be used to register, a verification code has been sent to it.';

    public function register(RegisterStudentRequest $request, StudentRegistrationService $registrations): JsonResponse
    {
        $registrations->register($request->validated());

        return $this->accepted();
    }

    public function verify(VerifyStudentRegistrationRequest $request, StudentRegistrationService $registrations): JsonResponse
    {
        $validated = $request->validated();

        if ($registrations->verify($validated['email'], $validated['code']) === null) {
            // The same answer for a wrong, expired or used code and for an email or number that was taken meanwhile.
            return response()->json([
                'message' => 'The code is invalid or expired. Request a new code and try again.',
            ], 422);
        }

        return response()->json([
            'message' => 'Your account is ready. Sign in with your student number and password.',
        ], 201);
    }

    public function resend(ResendRegistrationCodeRequest $request, StudentRegistrationService $registrations): JsonResponse
    {
        $registrations->resend($request->validated()['email']);

        return $this->accepted();
    }

    private function accepted(): JsonResponse
    {
        return response()->json(['message' => self::GENERIC_ACCEPTED], 202);
    }
}
