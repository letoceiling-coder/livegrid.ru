<?php
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Apartment;

// Пометить 20 самых дешевых квартир как "горячие предложения"
Apartment::where('is_deleted', 0)
    ->whereNotNull('price')
    ->orderBy('price', 'asc')
    ->limit(20)
    ->update(['is_hot' => true]);

// Пометить 20 квартир с ближайшим сроком сдачи как "старт продаж"
Apartment::where('is_deleted', 0)
    ->whereNotNull('building_deadline_at')
    ->where('building_deadline_at', '>=', now())
    ->orderBy('building_deadline_at', 'asc')
    ->limit(20)
    ->update(['is_start_sales' => true]);

$hot = Apartment::where('is_hot', true)->count();
$startSales = Apartment::where('is_start_sales', true)->count();

echo json_encode([
    'updated' => true,
    'is_hot_count' => $hot,
    'is_start_sales_count' => $startSales
]);
