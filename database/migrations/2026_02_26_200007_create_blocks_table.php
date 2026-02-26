<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blocks', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->unsignedBigInteger('crm_id')->nullable()->unique();

            // Core fields — FULLTEXT indexed
            $table->string('name', 255);
            $table->text('description')->nullable();

            // Address
            $table->string('address', 512)->nullable();
            $table->char('district_id', 24)->nullable()->index();
            $table->string('district_name', 255)->nullable();

            // Builder (denormalized for speed)
            $table->char('builder_id', 24)->nullable()->index();
            $table->string('builder_name', 255)->nullable();

            // Geo — DECIMAL + separate POINT for SPATIAL INDEX
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->json('geometry_json')->nullable()->comment('GeoJSON geometry from feed');

            // Status & metadata
            $table->boolean('is_city')->default(true)->index();
            $table->unsignedTinyInteger('status')->default(1);
            $table->date('deadline_at')->nullable()->index();

            // Price/area summary (pre-aggregated for listing)
            $table->decimal('min_price', 15, 2)->nullable();
            $table->decimal('max_price', 15, 2)->nullable();
            $table->decimal('min_area', 8, 2)->nullable();
            $table->decimal('max_area', 8, 2)->nullable();

            $table->json('images')->nullable();
            $table->timestamps();

            $table->foreign('district_id')->references('id')->on('regions')->nullOnDelete();
            $table->foreign('builder_id')->references('id')->on('builders')->nullOnDelete();
        });

        // FULLTEXT index for name + description search
        DB::statement('ALTER TABLE blocks ADD FULLTEXT INDEX blocks_fulltext (name, description)');

        // SPATIAL INDEX: generate a POINT column from lat/lng and index it
        DB::statement(
            "ALTER TABLE blocks ADD COLUMN location POINT NOT NULL " .
            "DEFAULT (ST_GeomFromText('POINT(0 0)', 4326)) SRID 4326 AFTER lng"
        );
        DB::statement('ALTER TABLE blocks ADD SPATIAL INDEX blocks_location_spatial (location)');
    }

    public function down(): void
    {
        Schema::dropIfExists('blocks');
    }
};
