<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('block_subway', function (Blueprint $table) {
            $table->char('block_id', 24);
            $table->char('subway_id', 24);
            $table->unsignedSmallInteger('travel_time')->nullable()->comment('Minutes');
            $table->unsignedTinyInteger('travel_type')->nullable()->comment('1=walk, 2=transport');

            $table->primary(['block_id', 'subway_id']);
            $table->index('subway_id');

            $table->foreign('block_id')->references('id')->on('blocks')->cascadeOnDelete();
            $table->foreign('subway_id')->references('id')->on('subways')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('block_subway');
    }
};
