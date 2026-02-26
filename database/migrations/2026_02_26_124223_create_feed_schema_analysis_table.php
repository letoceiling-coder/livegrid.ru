<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Feed schema analysis — auto-discovered field map.
 *
 * Each row = one unique dot-notation JSON path found in the feed.
 *
 * Example rows after analyzing a real-estate feed:
 *   path="projects"                                   type="array"   depth=0
 *   path="projects[].id"                              type="int"     depth=2
 *   path="projects[].developer.name"                  type="string"  depth=3
 *   path="projects[].buildings[].apartments[].area"   type="float"   depth=5
 *
 * NOTE on indexing:
 *   path can be very long (deep JSON = long dot-notation path).
 *   source_url is also long.
 *   Both are stored as TEXT. Hash columns are used for the unique constraint.
 *   Unique key: (source_hash, path_hash) where path_hash = MD5(path).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feed_schema_analysis', function (Blueprint $table) {
            $table->id();

            // Full endpoint URL (TEXT, not indexed directly)
            $table->text('source_url')->comment('Feed endpoint the path was found in');

            // MD5(source_url) for indexed lookups
            $table->char('source_hash', 32)->index()->comment('MD5(source_url)');

            // Full dot-notation path stored as TEXT
            $table->text('path')->comment('Dot-notation JSON path, e.g. projects[].buildings[].area');

            // MD5(path) for unique constraint (path TEXT cannot be used in UNIQUE KEY directly)
            $table->char('path_hash', 32)->comment('MD5(path) for unique indexing');

            // JSON value type at this path
            // Values: string | int | float | bool | array | object | null | mixed
            $table->string('type', 20)->comment('Detected value type');

            // How many times this path appeared across all sampled objects
            $table->unsignedBigInteger('occurrences')->default(0);

            // How often this field was null
            $table->unsignedBigInteger('null_count')->default(0);

            // Representative non-null value (truncated)
            $table->string('example_value', 255)->nullable();

            // Depth in the object tree (root = 0)
            $table->unsignedTinyInteger('depth')->default(0);

            // Whether this field appears in every object
            $table->boolean('is_always_present')->default(false);

            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate();

            // Unique: one row per (source_url + path) combo
            $table->unique(['source_hash', 'path_hash'], 'feed_schema_source_path_unique');

            // Quick lookups
            $table->index('type');
            $table->index('depth');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feed_schema_analysis');
    }
};
