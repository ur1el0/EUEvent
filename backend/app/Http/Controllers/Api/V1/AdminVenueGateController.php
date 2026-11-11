<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreVenueGateRequest;
use App\Http\Requests\Api\V1\UpdateVenueGateRequest;
use App\Http\Resources\Api\V1\VenueGateResource;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueGate;
use App\Services\AdminVenueService;
use Illuminate\Http\JsonResponse;

class AdminVenueGateController extends Controller
{
    public function store(StoreVenueGateRequest $request, Venue $venue, AdminVenueService $venues): JsonResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User, 403);

        $gate = $venues->createGate($venue, $request->validated(), $actor);

        return response()->json((new VenueGateResource($gate))->resolve($request), 201);
    }

    /** The route scopes {gate} to {venue}, so a gate from another venue is a 404. */
    public function update(UpdateVenueGateRequest $request, Venue $venue, VenueGate $gate, AdminVenueService $venues): JsonResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User, 403);

        $updated = $venues->updateGate($venue, $gate, $request->validated(), $actor);

        return response()->json((new VenueGateResource($updated))->resolve($request));
    }
}
