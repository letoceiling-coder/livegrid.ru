<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'role')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('role', 32)->default('user')->after('password');
            });
        }

        DB::table('users')
            ->whereNull('role')
            ->update(['role' => 'user']);

        DB::table('users')->updateOrInsert(
            ['email' => 'dsc-23@yandex.ru'],
            [
                'name' => 'Джон Уик',
                'password' => Hash::make('123123123'),
                'role' => 'admin',
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'role')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('role');
            });
        }
    }
};

