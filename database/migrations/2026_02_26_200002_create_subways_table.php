<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subways', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->unsignedBigInteger('crm_id')->nullable()->unique();
            $table->string('name', 255);
            $table->string('line_name', 100)->nullable();
            $table->string('line_color', 20)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subways');
    }
};
