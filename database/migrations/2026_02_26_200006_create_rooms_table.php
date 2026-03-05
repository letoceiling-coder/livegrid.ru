<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // rooms.crm_id is the natural PK: 0=Studio, 1=1-room, 2=2-room, etc.
        Schema::create('rooms', function (Blueprint $table) {
            $table->unsignedSmallInteger('crm_id')->primary();
            $table->char('feed_id', 24)->nullable()->unique()->comment('MongoDB _id from feed');
            $table->string('name', 50);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
