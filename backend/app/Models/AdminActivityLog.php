<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'actor_user_id',
    'action',
    'subject_type',
    'subject_id',
    'subject_label',
    'created_at',
])]
class AdminActivityLog extends Model
{
    public const ACTION_STUDENT_ACCOUNT_CREATED = 'student_account_created';

    public const ACTION_SECURITY_STAFF_ACCOUNT_CREATED = 'security_staff_account_created';

    public const ACTION_SECURITY_STAFF_ACTIVATED = 'security_staff_activated';

    public const ACTION_SECURITY_STAFF_DEACTIVATED = 'security_staff_deactivated';

    public const ACTION_ACCOUNT_PASSWORD_CHANGED = 'account_password_changed';

    public const ACTION_SECURITY_STAFF_DELETED = 'security_staff_deleted';

    public const ACTION_STUDENT_DELETED = 'student_deleted';

    public const ACTION_VENUE_CREATED = 'venue_created';

    public const ACTION_VENUE_UPDATED = 'venue_updated';

    public const ACTION_VENUE_GATE_CREATED = 'venue_gate_created';

    public const ACTION_VENUE_GATE_UPDATED = 'venue_gate_updated';

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'created_at' => 'immutable_datetime',
        ];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id')->withTrashed();
    }
}
