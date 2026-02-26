<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('buildings', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->unsignedBigInteger('crm_id')->nullable()->unique();

            $table->char('block_id', 24)->nullable()->index();
            $table->string('name', 100)->nullable()->comment('Housing number within block, e.g. 1, 2, 3');
            $table->char('building_type_id', 24)->nullable()->index();

            $table->unsignedSmallInteger('floors_total')->nullable();
            $table->date('deadline_at')->nullable()->index();
            $table->unsignedTinyInteger('queue')->nullable();
            $table->decimal('height', 6, 2)->nullable();
            $table->unsignedTinyInteger('status')->default(1);

            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();

            $table->json('banks')->nullable()->comment('Accredited bank IDs from feed');
            $table->timestamps();

            $table->foreign('block_id')->references('id')->on('blocks')->nullOnDelete();
            $table->foreign('building_type_id')->references('id')->on('building_types')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('buildings');
    }
};
