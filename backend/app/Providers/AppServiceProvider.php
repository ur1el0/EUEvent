<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRegistrationRateLimits();
    }

    /**
     * Public registration endpoints are limited per client address and per email, so one person cannot
     * flood an inbox or guess codes across many requests.
     */
    private function configureRegistrationRateLimits(): void
    {
        $limits = static function (Request $request, int $perMinute, int $perHour, int $perEmailPerHour): array {
            $email = $request->input('email');
            $limits = [
                Limit::perMinute($perMinute)->by('registration-ip-minute:'.$request->ip()),
                Limit::perHour($perHour)->by('registration-ip-hour:'.$request->ip()),
            ];

            if (is_string($email) && $email !== '') {
                $limits[] = Limit::perHour($perEmailPerHour)->by('registration-email:'.mb_strtolower(trim($email)));
            }

            return $limits;
        };

        RateLimiter::for('student-register', fn (Request $request) => $limits($request, 5, 20, 3));
        RateLimiter::for('student-register-verify', fn (Request $request) => $limits($request, 10, 60, 15));
        RateLimiter::for('student-register-resend', fn (Request $request) => $limits($request, 5, 20, 5));
    }
}
