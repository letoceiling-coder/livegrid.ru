<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = ['regions', 'builders', 'subways', 'finishings', 'building_types', 'rooms', 'media', 'blocks', 'apartments'];

        foreach ($tables as $table) {
            if (! Schema::hasColumn($table, 'is_active')) {
                Schema::table($table, function (Blueprint $t): void {
                    $t->boolean('is_active')->default(true);
                });
            }

            if (! Schema::hasColumn($table, 'position')) {
                Schema::table($table, function (Blueprint $t): void {
                    $t->integer('position')->default(0)->after('is_active');
                });
            }
        }

        if (! Schema::hasColumn('media', 'folder')) {
            Schema::table('media', function (Blueprint $t): void {
                $t->string('folder', 255)->nullable()->after('type');
            });
        }

        if (! Schema::hasColumn('media', 'tags')) {
            Schema::table('media', function (Blueprint $t): void {
                $t->json('tags')->nullable()->after('folder');
            });
        }
    }

    public function down(): void
    {
        $tables = ['regions', 'builders', 'subways', 'finishings', 'building_types', 'rooms', 'media', 'blocks', 'apartments'];

        foreach ($tables as $table) {
            if (Schema::hasColumn($table, 'position')) {
                Schema::table($table, function (Blueprint $t): void {
                    $t->dropColumn('position');
                });
            }
            if (Schema::hasColumn($table, 'is_active')) {
                Schema::table($table, function (Blueprint $t): void {
                    $t->dropColumn('is_active');
                });
            }
        }

        if (Schema::hasColumn('media', 'tags')) {
            Schema::table('media', function (Blueprint $t): void {
                $t->dropColumn('tags');
            });
        }
        if (Schema::hasColumn('media', 'folder')) {
            Schema::table('media', function (Blueprint $t): void {
                $t->dropColumn('folder');
            });
        }
    }
};

