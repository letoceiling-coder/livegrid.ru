<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Raw feed snapshots.
 *
 * Each row = one complete download of a feed endpoint.
 * purpose: history of feed state, change detection, raw payload archive.
 *
 * NOTE on source_url indexing:
 *   MySQL max key length is 3072 bytes (utf8mb4 = 4 bytes/char).
 *   varchar(2048) would require 8192 bytes → exceeds limit.
 *   Solution: store full URL in TEXT, add source_hash VARCHAR(32) (MD5)
 *   and index on source_hash. Application must set source_hash = MD5(source_url).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feed_raw_snapshots', function (Blueprint $table) {
            $table->id();

            // Full endpoint URL stored as TEXT (not indexable directly)
            $table->text('source_url')->comment('Feed endpoint URL (full)');

            // MD5 hash of source_url for fast indexed lookups
            // Application must populate: md5($url)
            $table->char('source_hash', 32)->index()->comment('MD5(source_url) for indexing');

            // Short label derived from URL, for display/filtering
            $table->string('source_label', 255)->nullable()->comment('Human-readable label, e.g. "primary"');

            // Complete raw JSON response body
            $table->longText('payload')->nullable()->comment('Full JSON payload; nullable if save_payload=false');

            // SHA-1 hash of payload — compare with previous run to detect changes
            $table->char('checksum', 40)->index()->comment('SHA-1 of raw payload');

            // Byte size of the payload
            $table->unsignedBigInteger('payload_bytes')->default(0);

            // Top-level object counts (best-effort auto-detected)
            $table->unsignedInteger('objects_count')->default(0)->comment('Count of root-level objects/items');
            $table->unsignedInteger('projects_count')->default(0)->comment('Detected ЖК / projects');
            $table->unsignedInteger('buildings_count')->default(0)->comment('Detected buildings / корпуса');
            $table->unsignedInteger('apartments_count')->default(0)->comment('Detected apartments / квартиры');

            // HTTP response metadata
            $table->unsignedSmallInteger('http_status')->nullable();
            $table->float('download_seconds')->nullable();

            // Whether the feed changed since last snapshot
            $table->boolean('is_changed')->default(true)->comment('False if checksum matches previous run');

            $table->timestamp('created_at')->useCurrent()->index();

            // For finding the latest snapshot of a given endpoint
            $table->index(['source_hash', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feed_raw_snapshots');
    }
};
