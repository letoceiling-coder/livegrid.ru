<?php
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Apartment;

$total = Apartment::where('is_deleted', 0)->count();
$hot = Apartment::where('is_deleted', 0)->where('is_hot', true)->count();
$startSales = Apartment::where('is_deleted', 0)->where('is_start_sales', true)->count();

echo json_encode([
    'total' => $total,
    'is_hot_count' => $hot,
    'is_start_sales_count' => $startSales
]);
