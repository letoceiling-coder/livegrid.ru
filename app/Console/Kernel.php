<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Feed analysis: runs every day at 03:00 server time.
        // Feed updates weekly per documentation — daily run detects changes early.
        // Change to ->weeklyOn(1, '03:00') once feed schedule is confirmed.
        $schedule->command('feed:analyze')
                 ->dailyAt('03:00')
                 ->withoutOverlapping()          // skip if previous run is still in progress
                 ->sendOutputTo(storage_path('logs/feed-cron.log'))
                 ->onFailure(function () {
                     \Illuminate\Support\Facades\Log::channel('feed')
                         ->error('feed:analyze scheduled run failed');
                 });
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
