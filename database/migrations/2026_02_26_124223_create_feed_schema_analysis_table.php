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
 *   path="projects"                          type="array"   occurrences=1
 *   path="projects[].id"                     type="int"     occurrences=47
 *   path="projects[].name"                   type="string"  occurrences=47
 *   path="projects[].developer.name"         type="string"  occurrences=47
 *   path="projects[].buildings[].apartments[].area"  type="float"  occurrences=4380
 *
 * This table is the foundation for data modeling in the next phase.
 * Before designing the final schema — read this table to understand
 * which fields exist, their types, and how frequently they appear.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feed_schema_analysis', function (Blueprint $table) {
            $table->id();

            // Which endpoint this schema belongs to
            $table->string('source_url', 2048)->comment('Feed endpoint the path was found in');

            // Dot-notation path: "projects[].buildings[].apartments[].area"
            $table->string('path', 1024)->comment('Dot-notation JSON path');

            // JSON value type at this path
            // Values: string | int | float | bool | array | object | null | mixed
            // "mixed" = inconsistent type across occurrences
            $table->string('type', 20)->comment('Detected value type');

            // How many times this path appeared across all sampled objects
            $table->unsignedBigInteger('occurrences')->default(0)->comment('Count across sampled items');

            // Nullable count — how often this field was null vs present
            $table->unsignedBigInteger('null_count')->default(0)->comment('Count of null values at this path');

            // Representative non-null value (truncated to 200 chars)
            $table->string('example_value', 255)->nullable()->comment('First non-null example value');

            // Depth in the object tree (root = 0)
            $table->unsignedTinyInteger('depth')->default(0)->comment('Nesting depth (0 = root)');

            // Whether this field appears in every object or only sometimes
            $table->boolean('is_always_present')->default(false)->comment('True if occurrences == parent occurrences');

            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate();

            // Unique constraint: one row per (source_url, path)
            $table->unique(['source_url', 'path'], 'feed_schema_source_path_unique');

            // Quick lookups
            $table->index('path');
            $table->index('type');
            $table->index('depth');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feed_schema_analysis');
    }
};
