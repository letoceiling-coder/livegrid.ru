<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apartments', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->unsignedBigInteger('crm_id')->nullable()->unique();

            // Relations
            $table->char('building_id', 24)->index();
            $table->char('block_id', 24)->index();

            // Rooms
            $table->unsignedSmallInteger('room')->nullable()->comment('0=studio, 1=1-room, etc.');
            $table->unsignedSmallInteger('rooms_crm_id')->nullable()->index()->comment('FK to rooms.crm_id');

            // Physical
            $table->smallInteger('floor')->nullable()->index();
            $table->unsignedSmallInteger('floors_total')->nullable();
            $table->string('number', 30)->nullable()->comment('Apartment number');
            $table->unsignedTinyInteger('wc_count')->nullable();

            // Areas — stored as DECIMAL to avoid float precision issues
            $table->decimal('area_total', 8, 2)->nullable()->index();
            $table->decimal('area_living', 8, 2)->nullable();
            $table->decimal('area_kitchen', 8, 2)->nullable();
            $table->decimal('area_given', 8, 2)->nullable();
            $table->decimal('area_balconies', 8, 2)->nullable();
            $table->string('area_rooms', 100)->nullable()->comment('Room breakdown, e.g. "17+12.6"');
            $table->decimal('area_rooms_total', 8, 2)->nullable();

            // Price — DECIMAL, never float
            $table->decimal('price', 15, 2)->nullable()->index();
            $table->decimal('price_per_meter', 10, 2)->nullable();

            // Type & finishing
            $table->char('finishing_id', 24)->nullable()->index();
            $table->char('building_type_id', 24)->nullable();

            // Media
            $table->string('plan_url', 512)->nullable();

            // ── Denormalized block fields (for filter performance) ────────────
            $table->string('block_name', 255)->nullable();
            $table->char('block_district_id', 24)->nullable()->index();
            $table->string('block_district_name', 255)->nullable();
            $table->char('block_builder_id', 24)->nullable()->index();
            $table->string('block_builder_name', 255)->nullable();
            $table->decimal('block_lat', 10, 7)->nullable();
            $table->decimal('block_lng', 10, 7)->nullable();
            $table->boolean('block_is_city')->default(true)->index();

            // ── Denormalized building field ───────────────────────────────────
            $table->date('building_deadline_at')->nullable()->index();

            // ── Soft-delete via is_deleted (no SoftDeletes trait) ────────────
            $table->boolean('is_deleted')->default(false)->index();
            $table->timestamp('last_seen_at')->nullable()->index();

            $table->timestamps();

            // ── FK constraints (no cascade delete per requirements) ──────────
            $table->foreign('building_id')->references('id')->on('buildings');
            $table->foreign('block_id')->references('id')->on('blocks');
            $table->foreign('finishing_id')->references('id')->on('finishings')->nullOnDelete();
            $table->foreign('rooms_crm_id')->references('crm_id')->on('rooms')->nullOnDelete();

            // ── Composite indexes ─────────────────────────────────────────────
            $table->index(['price', 'area_total'], 'idx_price_area');
            $table->index(['block_district_id', 'room'], 'idx_district_room');
            $table->index(['block_is_city', 'room', 'price'], 'idx_city_room_price');
            $table->index(['block_lat', 'block_lng'], 'idx_geo');
        });

        // FULLTEXT index on denormalized text columns (for search)
        DB::statement(
            'ALTER TABLE apartments ADD FULLTEXT INDEX apartments_search_fulltext ' .
            '(block_name, block_builder_name, block_district_name)'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('apartments');
    }
};
