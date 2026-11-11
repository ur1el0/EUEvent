<?php

namespace App\Services;

use App\Models\AdminActivityLog;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueGate;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Venues and their physical gates. Gates are only added or edited, never removed, and ids never change,
 * because events, tickets and offline scanner manifests refer to venue_gates by id.
 */
class AdminVenueService
{
    /** @return Collection<int, Venue> */
    public function index(): Collection
    {
        return Venue::query()
            ->with(['gates' => fn ($query) => $query->orderBy('name')->orderBy('id')])
            ->orderBy('name')
            ->orderBy('id')
            ->get();
    }

    /** @param array{name: string, location_details?: string|null} $data */
    public function create(array $data, User $actor): Venue
    {
        return DB::transaction(function () use ($data, $actor): Venue {
            $venue = new Venue;
            $venue->name = $data['name'];
            $venue->location_details = $data['location_details'] ?? null;
            $venue->save();

            $this->record($actor, AdminActivityLog::ACTION_VENUE_CREATED, 'venue', $venue->getKey(), $venue->name);

            return $venue->setRelation('gates', new Collection);
        });
    }

    /** @param array{name?: string, location_details?: string|null} $data */
    public function update(Venue $venue, array $data, User $actor): Venue
    {
        return DB::transaction(function () use ($venue, $data, $actor): Venue {
            $locked = Venue::query()->whereKey($venue->getKey())->lockForUpdate()->firstOrFail();
            $locked->fill($data);

            if ($locked->isDirty()) {
                $locked->save();
                $this->record($actor, AdminActivityLog::ACTION_VENUE_UPDATED, 'venue', $locked->getKey(), $locked->name);
            }

            return $locked->load(['gates' => fn ($query) => $query->orderBy('name')->orderBy('id')]);
        });
    }

    /** @param array{code: string, name: string} $data */
    public function createGate(Venue $venue, array $data, User $actor): VenueGate
    {
        return DB::transaction(function () use ($venue, $data, $actor): VenueGate {
            $locked = Venue::query()->whereKey($venue->getKey())->lockForUpdate()->firstOrFail();

            $gate = new VenueGate;
            $gate->venue_id = $locked->getKey();
            $gate->code = $data['code'];
            $gate->name = $data['name'];
            $gate->save();

            $this->record($actor, AdminActivityLog::ACTION_VENUE_GATE_CREATED, 'venue_gate', $gate->getKey(), $locked->name.' · '.$gate->code);

            return $gate;
        });
    }

    /** @param array{code?: string, name?: string} $data */
    public function updateGate(Venue $venue, VenueGate $gate, array $data, User $actor): VenueGate
    {
        return DB::transaction(function () use ($venue, $gate, $data, $actor): VenueGate {
            $lockedVenue = Venue::query()->whereKey($venue->getKey())->lockForUpdate()->firstOrFail();
            $lockedGate = VenueGate::query()
                ->whereKey($gate->getKey())
                ->where('venue_id', $lockedVenue->getKey())
                ->lockForUpdate()
                ->firstOrFail();
            $lockedGate->fill($data);

            if ($lockedGate->isDirty()) {
                $lockedGate->save();
                $this->record($actor, AdminActivityLog::ACTION_VENUE_GATE_UPDATED, 'venue_gate', $lockedGate->getKey(), $lockedVenue->name.' · '.$lockedGate->code);
            }

            return $lockedGate;
        });
    }

    private function record(User $actor, string $action, string $subjectType, int $subjectId, string $label): void
    {
        AdminActivityLog::query()->create([
            'actor_user_id' => $actor->getKey(),
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'subject_label' => $label,
            'created_at' => now(),
        ]);
    }
}
