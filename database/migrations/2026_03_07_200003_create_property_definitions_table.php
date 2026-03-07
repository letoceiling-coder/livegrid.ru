<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('property_definitions', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 64)->unique();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->enum('data_type', ['string', 'number', 'boolean', 'date', 'json', 'enum'])->index();
            $table->boolean('is_required')->default(false)->index();
            $table->boolean('is_filterable')->default(false)->index();
            $table->boolean('is_multivalue')->default(false)->index();
            $table->text('default_value')->nullable();
            $table->foreignId('object_type_id')
                ->nullable()
                ->constrained('catalog_object_types')
                ->cascadeOnUpdate()
                ->nullOnDelete();
            $table->boolean('is_active')->default(true)->index();
            $table->integer('position')->default(0)->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_definitions');
    }
};

