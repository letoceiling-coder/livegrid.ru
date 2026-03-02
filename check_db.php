<?php
require '/var/www/livegrid/backend/vendor/autoload.php';
$app = require '/var/www/livegrid/backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Block check
$block = App\Models\Block::find('5f802855d2187d0008a431b8');
echo "=== BLOCK ===\n";
echo "name: " . ($block->name ?? 'NULL') . "\n";
echo "has_description: " . ($block->description ? 'YES len='.strlen($block->description) : 'NULL') . "\n";
echo "has_address: " . ($block->address ?? 'NULL') . "\n";
echo "has_images: " . ($block->images ? 'YES count='.count($block->images) : 'NULL') . "\n";

// Building check
$building = App\Models\Building::where('block_id', '5f802855d2187d0008a431b8')->first();
echo "\n=== BUILDING ===\n";
if ($building) {
    echo "name: " . ($building->name ?? 'NULL') . "\n";
    echo "queue: " . ($building->queue ?? 'NULL') . "\n";
    echo "floors_total: " . ($building->floors_total ?? 'NULL') . "\n";
    echo "deadline_at: " . ($building->deadline_at ?? 'NULL') . "\n";
} else {
    echo "NOT FOUND\n";
}

// Direct apartment check
$apt = App\Models\Apartment::with(['building', 'block'])->find('60dc53478d059944038be4f4');
echo "\n=== APARTMENT ===\n";
echo "room: " . $apt->room . "\n";
echo "building_id: " . $apt->building_id . "\n";
echo "building_loaded: " . ($apt->relationLoaded('building') ? 'YES' : 'NO') . "\n";
echo "block_loaded: " . ($apt->relationLoaded('block') ? 'YES' : 'NO') . "\n";
if ($apt->relationLoaded('building') && $apt->building) {
    echo "building.name: " . ($apt->building->name ?? 'NULL') . "\n";
    echo "building.floors_total: " . ($apt->building->floors_total ?? 'NULL') . "\n";
}
if ($apt->relationLoaded('block') && $apt->block) {
    echo "block.images count: " . count($apt->block->images ?? []) . "\n";
    echo "block.description: " . ($apt->block->description ? substr($apt->block->description, 0, 50) : 'NULL') . "\n";
}
