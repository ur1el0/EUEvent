<?php

namespace App\Services;

use App\Models\AdminActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

class AdminSecurityStaffAccessService
{
    public function setActive(User $staff, User $actor, bool $isActive): User
    {
        return DB::transaction(function () use ($staff, $actor, $isActive): User {
            $lockedStaff = User::query()
                ->where('role', User::ROLE_SECURITY_STAFF)
                ->lockForUpdate()
                ->find($staff->getKey());

            if (! $lockedStaff instanceof User) {
                throw (new ModelNotFoundException)->setModel(User::class, [$staff->getKey()]);
            }

            if ((bool) $lockedStaff->is_active === $isActive) {
                return $lockedStaff;
            }

            $lockedStaff->is_active = $isActive;
            $lockedStaff->save();

            if (! $isActive) {
                $lockedStaff->tokens()->delete();
            }

            AdminActivityLog::query()->create([
                'actor_user_id' => $actor->getKey(),
                'action' => $isActive
                    ? AdminActivityLog::ACTION_SECURITY_STAFF_ACTIVATED
                    : AdminActivityLog::ACTION_SECURITY_STAFF_DEACTIVATED,
                'subject_type' => 'security_staff',
                'subject_id' => $lockedStaff->getKey(),
                'subject_label' => $lockedStaff->name.' · '.$lockedStaff->email,
                'created_at' => now(),
            ]);

            return $lockedStaff->refresh();
        }, 3);
    }
}
