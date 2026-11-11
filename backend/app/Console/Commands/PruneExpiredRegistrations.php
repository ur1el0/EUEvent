<?php

namespace App\Console\Commands;

use App\Services\StudentRegistrationService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('registrations:prune')]
#[Description('Delete expired pending student registrations')]
class PruneExpiredRegistrations extends Command
{
    public function handle(StudentRegistrationService $registrations): int
    {
        $this->info('Removed '.$registrations->prune().' expired pending registration(s).');

        return self::SUCCESS;
    }
}
