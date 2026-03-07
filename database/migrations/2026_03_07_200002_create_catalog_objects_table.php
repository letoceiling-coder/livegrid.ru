<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_objects', function (Blueprint $table): void {
            $table->id();
            $table->string('external_id', 128)->nullable()->index();
            $table->enum('source_type', ['feed', 'manual', 'import'])->default('manual')->index();
            $table->foreignId('object_type_id')
                ->constrained('catalog_object_types')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->string('name', 255);
            $table->string('slug', 255)->nullable()->unique();
            $table->text('description')->nullable();
            $table->enum('lifecycle_status', ['draft', 'in_review', 'published', 'archived'])
                ->default('draft')
                ->index();
            $table->boolean('manual_override')->default(false)->index();
            $table->boolean('is_active')->default(true)->index();
            $table->integer('position')->default(0)->index();
            $table->json('meta')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_objects');
    }
};

