<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Drop the incorrect FK constraint from blocks.district_id.
 *
 * blocks.district_id contains Moscow administrative district IDs
 * from the feed — these are NOT rows in the regions table.
 * regions contains broader geographic regions (Moscow, Moscow Oblast).
 * The FK caused integrity violations during upsertBlocks().
 *
 * The INDEX on district_id is preserved for query performance.
 * blocks.builder_id -> builders.id FK is correct and remains intact.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('blocks', function (Blueprint $table) {
            // Drop FK only — the INDEX blocks_district_id_index stays
            $table->dropForeign('blocks_district_id_foreign');
        });
    }

    public function down(): void
    {
        Schema::table('blocks', function (Blueprint $table) {
            $table->foreign('district_id')
                  ->references('id')
                  ->on('regions')
                  ->nullOnDelete();
        });
    }
};
