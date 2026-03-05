<?php

namespace App\Console\Commands;

use App\Services\Feed\FeedSyncService;
use Illuminate\Console\Command;
use Throwable;

/**
 * php artisan feed:sync [--dry-run]
 *
 * Runs the full production feed synchronization:
 *  1. Downloads all JSON endpoints
 *  2. Upserts reference data + blocks + buildings + apartments
 *  3. Marks stale apartments as is_deleted=true
 *  4. Logs stats
 */
class FeedSyncCommand extends Command
{
    protected $signature = 'feed:sync
        {--dry-run : Validate data without writing to database}';

    protected $description = 'Synchronize production database from live JSON feed';

    public function __construct(private readonly FeedSyncService $syncService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        if ($dryRun) {
            $this->info('🔍 DRY-RUN mode — no data will be written');
        } else {
            $this->info('🚀 Starting feed sync…');
        }

        try {
            $stats = $this->syncService->sync($dryRun);
        } catch (Throwable $e) {
            $this->error('❌ Sync failed: ' . $e->getMessage());
            $this->line($e->getTraceAsString());
            return self::FAILURE;
        }

        if ($dryRun) {
            $this->info('✅ Dry-run complete. Data counts:');
            $this->table(['Entity', 'Count'], collect($stats['summary'] ?? [])->map(
                fn ($count, $key) => [$key, $count]
            )->values()->toArray());
            return self::SUCCESS;
        }

        $this->info('✅ Sync complete.');
        $this->table(
            ['Entity', 'Upserted'],
            collect($stats)
                ->except(['duration_seconds'])
                ->flatMap(function ($val, $key) {
                    if (is_array($val)) {
                        return [[$key, implode(' / ', array_map(
                            fn ($v, $k) => "{$k}: {$v}",
                            $val,
                            array_keys($val)
                        ))]];
                    }
                    return [];
                })
                ->values()
                ->toArray()
        );

        $duration = $stats['duration_seconds'] ?? 0;
        $this->line("⏱ Duration: {$duration}s");

        return self::SUCCESS;
    }
}
