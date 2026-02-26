<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Raw feed snapshots.
 *
 * Each row = one complete download of a feed endpoint.
 * Purpose: keep the history of what the feed looked like over time,
 * detect changes between runs, avoid re-analysis if feed hasn't changed.
 *
 * payload is stored as LONGTEXT because real-estate feeds can be 50-200 MB.
 * checksum (SHA-1) allows quick equality checks without reading full payload.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feed_raw_snapshots', function (Blueprint $table) {
            $table->id();

            // Which endpoint this snapshot belongs to
            $table->string('source_url', 2048)->comment('Feed endpoint URL');

            // Short label derived from the URL, for display/filtering
            $table->string('source_label', 255)->nullable()->comment('Human-readable label, e.g. "primary"');

            // The complete raw JSON response body
            $table->longText('payload')->nullable()->comment('Full JSON payload; nullable if save_payload=false');

            // SHA-1 hash of payload — compare with previous run to detect changes
            $table->string('checksum', 40)->index()->comment('SHA-1 of raw payload');

            // Byte size of the payload
            $table->unsignedBigInteger('payload_bytes')->default(0)->comment('Size in bytes');

            // Top-level object counts (best-effort auto-detected)
            $table->unsignedInteger('objects_count')->default(0)->comment('Count of root-level objects/items');
            $table->unsignedInteger('projects_count')->default(0)->comment('Detected ЖК / projects');
            $table->unsignedInteger('buildings_count')->default(0)->comment('Detected buildings / корпуса');
            $table->unsignedInteger('apartments_count')->default(0)->comment('Detected apartments / квартиры');

            // HTTP response metadata
            $table->unsignedSmallInteger('http_status')->nullable()->comment('HTTP response code');
            $table->float('download_seconds')->nullable()->comment('Time to download in seconds');

            // Whether the feed changed since last snapshot
            $table->boolean('is_changed')->default(true)->comment('False if checksum matches previous run');

            $table->timestamp('created_at')->useCurrent()->index();

            // For finding the latest snapshot of a given endpoint
            $table->index(['source_url', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feed_raw_snapshots');
    }
};
