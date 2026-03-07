<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('object_property_values', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('catalog_object_id')
                ->constrained('catalog_objects')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->foreignId('property_definition_id')
                ->constrained('property_definitions')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->longText('value_text')->nullable();
            $table->decimal('value_number', 18, 4)->nullable();
            $table->boolean('value_boolean')->nullable();
            $table->date('value_date')->nullable();
            $table->json('value_json')->nullable();

            $table->enum('value_source', ['feed', 'manual', 'import'])->default('manual')->index();
            $table->boolean('is_locked_by_manual')->default(false)->index();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->unique(['catalog_object_id', 'property_definition_id'], 'object_property_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('object_property_values');
    }
};

