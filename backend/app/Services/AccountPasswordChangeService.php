<?php

namespace App\Services;

use App\Models\AdminActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AccountPasswordChangeService
{
    /**
     * Change a signed-in user's password and revoke every other API token.
     *
     * The token used for this request is kept so a scanner with encrypted
     * pending scans is not signed out in the middle of an event.
     */
    public function change(User $user, string $newPassword, int|string|null $currentTokenId): User
    {
        return DB::transaction(function () use ($user, $newPassword, $currentTokenId): User {
            $lockedUser = User::query()
                ->lockForUpdate()
                ->find($user->getKey());

            if (! $lockedUser instanceof User) {
                throw (new ModelNotFoundException)->setModel(User::class, [$user->getKey()]);
            }

            $lockedUser->forceFill(['password' => $newPassword]);
            $lockedUser->setRememberToken(Str::random(60));
            $lockedUser->save();

            $lockedUser->tokens()
                ->when($currentTokenId !== null, fn ($query) => $query->whereKeyNot($currentTokenId))
                ->delete();

            AdminActivityLog::query()->create([
                'actor_user_id' => $lockedUser->getKey(),
                'action' => AdminActivityLog::ACTION_ACCOUNT_PASSWORD_CHANGED,
                'subject_type' => $lockedUser->role,
                'subject_id' => $lockedUser->getKey(),
                'subject_label' => $lockedUser->name,
                'created_at' => now(),
            ]);

            return $lockedUser;
        }, 3);
    }
}
