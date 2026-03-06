<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Expand FULLTEXT indexes for unified search.
 *
 * blocks: add address, district_name, builder_name to search
 * subways: add index on name for metro search
 * apartments: keep existing apartments_search_fulltext (no change)
 */
return new class extends Migration
{
    public function up(): void
    {
        // blocks: replace blocks_fulltext with expanded blocks_search
        $this->dropFulltextIfExists('blocks', 'blocks_fulltext');
        $this->addFulltextIfNotExists('blocks', 'blocks_search', 'name, description, address, district_name, builder_name');

        // subways: add index on name
        if (! $this->indexExists('subways', 'subways_name_idx')) {
            Schema::table('subways', function (Blueprint $table) {
                $table->index('name', 'subways_name_idx');
            });
        }
    }

    public function down(): void
    {
        $this->dropFulltextIfExists('blocks', 'blocks_search');
        $this->addFulltextIfNotExists('blocks', 'blocks_fulltext', 'name, description');

        if ($this->indexExists('subways', 'subways_name_idx')) {
            Schema::table('subways', function (Blueprint $table) {
                $table->dropIndex('subways_name_idx');
            });
        }
    }

    private function dropFulltextIfExists(string $table, string $index): void
    {
        $indexes = DB::select("SHOW INDEX FROM {$table} WHERE Key_name = ?", [$index]);
        if (count($indexes) > 0) {
            DB::statement("ALTER TABLE {$table} DROP INDEX {$index}");
        }
    }

    private function addFulltextIfNotExists(string $table, string $index, string $columns): void
    {
        $indexes = DB::select("SHOW INDEX FROM {$table} WHERE Key_name = ?", [$index]);
        if (count($indexes) === 0) {
            DB::statement("ALTER TABLE {$table} ADD FULLTEXT INDEX {$index} ({$columns})");
        }
    }

    private function indexExists(string $table, string $index): bool
    {
        $indexes = DB::select("SHOW INDEX FROM {$table} WHERE Key_name = ?", [$index]);
        return count($indexes) > 0;
    }
};
