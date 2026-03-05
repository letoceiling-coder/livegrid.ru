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
        // ── Feed pipeline ─────────────────────────────────────────────────────
        //
        // Stage 1 — collect: download raw JSON at 03:00
        // Stage 2 — inspect: analyze schema at 03:30 (after collect finishes)
        //
        // Feed updates weekly per documentation.
        // Daily run detects changes early; change to ->weeklyOn(1, '03:00')
        // once feed schedule is confirmed.

        $schedule->command('feed:collect')
                 ->dailyAt('03:00')
                 ->withoutOverlapping()
                 ->appendOutputTo(storage_path('logs/feed-collect.log'))
                 ->onFailure(function () {
                     \Illuminate\Support\Facades\Log::channel('feed')
                         ->error('feed:collect scheduled run failed');
                 });

        $schedule->command('feed:inspect --dump-entities')
                 ->dailyAt('03:30')
                 ->withoutOverlapping()
                 ->appendOutputTo(storage_path('logs/feed-inspect.log'))
                 ->onFailure(function () {
                     \Illuminate\Support\Facades\Log::channel('feed')
                         ->error('feed:inspect scheduled run failed');
                 });

        // Legacy combined command (kept for compatibility, runs after inspect)
        $schedule->command('feed:analyze')
                 ->dailyAt('04:00')
                 ->withoutOverlapping()
                 ->appendOutputTo(storage_path('logs/feed-analyze.log'))
                 ->onFailure(function () {
                     \Illuminate\Support\Facades\Log::channel('feed')
                         ->error('feed:analyze scheduled run failed');
                 });

        // Production DB sync — runs after discovery (04:30)
        $schedule->command('feed:sync')
                 ->dailyAt('04:30')
                 ->withoutOverlapping()
                 ->appendOutputTo(storage_path('logs/feed-sync.log'))
                 ->onFailure(function () {
                     \Illuminate\Support\Facades\Log::channel('feed')
                         ->error('feed:sync scheduled run failed');
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
