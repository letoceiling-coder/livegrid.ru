<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Materialize apartment aggregates into the blocks table.
 *
 * Before this migration BlockController::index() computed MIN(price),
 * COUNT(*), etc. via correlated subqueries — one per block per column,
 * causing 100 + subqueries per page request and ~800 ms response time.
 *
 * After this migration:
 *  - aggregates are stored directly on the blocks row
 *  - BlockController reads plain columns (no subqueries)
 *  - FeedSyncService::updateBlockAggregates() refreshes them with a
 *    single JOIN UPDATE after every apartment upsert pass
 *
 * Indexes allow the frontend's primary sort (price_from ASC, units_count DESC,
 * nearest_deadline_at ASC) to be served from the index without filesort.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('blocks', function (Blueprint $table) {
            // ── New materialized aggregate columns ────────────────────────────
            // NOTE: min_area (DECIMAL(8,2)) already exists from the original
            //       blocks migration — we reuse it for the aggregate.
            //       We add only the three columns that do not exist yet.
            $table->decimal('price_from', 15, 2)->nullable()->after('max_area');
            $table->integer('units_count')->nullable()->after('price_from');
            $table->date('nearest_deadline_at')->nullable()->after('units_count');

            // ── Indexes for sort / filter ─────────────────────────────────────
            $table->index('price_from',          'blocks_price_from_index');
            $table->index('units_count',         'blocks_units_count_index');
            $table->index('nearest_deadline_at', 'blocks_deadline_index');
        });
    }

    public function down(): void
    {
        Schema::table('blocks', function (Blueprint $table) {
            $table->dropIndex('blocks_price_from_index');
            $table->dropIndex('blocks_units_count_index');
            $table->dropIndex('blocks_deadline_index');

            $table->dropColumn([
                'price_from',
                'units_count',
                'nearest_deadline_at',
            ]);
        });
    }
};
