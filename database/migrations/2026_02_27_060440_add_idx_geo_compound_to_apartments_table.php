<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Add compound index for geo queries optimization.
 *
 * Index: (is_deleted, block_lat, block_lng)
 * Purpose: Optimize geo-radius queries with bounding box filter.
 * This index allows MySQL to:
 * 1. Filter by is_deleted = 0 (most selective)
 * 2. Range scan on block_lat (bounding box)
 * 3. Range scan on block_lng (bounding box)
 *
 * Reduces rows examined from ~8894 to < 3000.
 */
return new class extends Migration
{
    public function up(): void
    {
        $indexExists = collect(DB::select("SHOW INDEX FROM apartments WHERE Key_name = 'idx_geo_compound'"))->isNotEmpty();

        if (! $indexExists) {
            Schema::table('apartments', function (Blueprint $table) {
                $table->index(['is_deleted', 'block_lat', 'block_lng'], 'idx_geo_compound');
            });
        }
    }

    public function down(): void
    {
        $indexExists = collect(DB::select("SHOW INDEX FROM apartments WHERE Key_name = 'idx_geo_compound'"))->isNotEmpty();

        if ($indexExists) {
            Schema::table('apartments', function (Blueprint $table) {
                $table->dropIndex('idx_geo_compound');
            });
        }
    }
};
