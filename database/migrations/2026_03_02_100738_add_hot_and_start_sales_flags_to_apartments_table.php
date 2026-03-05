<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            $table->boolean('is_hot')->default(false)->after('is_deleted');
            $table->boolean('is_start_sales')->default(false)->after('is_hot');
            
            $table->index('is_hot');
            $table->index('is_start_sales');
        });
    }

    public function down(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            $table->dropIndex(['is_hot']);
            $table->dropIndex(['is_start_sales']);
            $table->dropColumn(['is_hot', 'is_start_sales']);
        });
    }
};
