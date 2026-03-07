<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('property_definition_options', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('property_definition_id')
                ->constrained('property_definitions')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->string('value', 255);
            $table->string('label', 255);
            $table->boolean('is_active')->default(true)->index();
            $table->integer('position')->default(0)->index();
            $table->timestamps();

            $table->unique(['property_definition_id', 'value'], 'property_definition_option_value_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_definition_options');
    }
};

