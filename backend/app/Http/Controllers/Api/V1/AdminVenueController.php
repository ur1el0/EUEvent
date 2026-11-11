<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ListAdminVenuesRequest;
use App\Http\Requests\Api\V1\StoreVenueRequest;
use App\Http\Requests\Api\V1\UpdateVenueRequest;
use App\Http\Resources\Api\V1\VenueResource;
use App\Models\User;
use App\Models\Venue;
use App\Services\AdminVenueService;
use Illuminate\Http\JsonResponse;

class AdminVenueController extends Controller
{
    public function index(ListAdminVenuesRequest $request, AdminVenueService $venues): JsonResponse
    {
        return response()->json([
            'venues' => VenueResource::collection($venues->index())->resolve($request),
        ]);
    }

    public function store(StoreVenueRequest $request, AdminVenueService $venues): JsonResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User, 403);

        $venue = $venues->create($request->validated(), $actor);

        return response()->json((new VenueResource($venue))->resolve($request), 201);
    }

    public function update(UpdateVenueRequest $request, Venue $venue, AdminVenueService $venues): JsonResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User, 403);

        $updated = $venues->update($venue, $request->validated(), $actor);

        return response()->json((new VenueResource($updated))->resolve($request));
    }
}
