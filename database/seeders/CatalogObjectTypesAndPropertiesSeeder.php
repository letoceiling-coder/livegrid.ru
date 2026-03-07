<?php

namespace Database\Seeders;

use App\Models\CatalogObjectType;
use App\Models\PropertyDefinition;
use Illuminate\Database\Seeder;

/**
 * Seeds catalog_object_types and property_definitions for feed→CRM mapping.
 * Run: php artisan db:seed --class=CatalogObjectTypesAndPropertiesSeeder
 */
class CatalogObjectTypesAndPropertiesSeeder extends Seeder
{
    public function run(): void
    {
        $blockType = CatalogObjectType::firstOrCreate(
            ['code' => 'block'],
            ['name' => 'ЖК / комплекс', 'description' => 'Жилой комплекс из фида blocks', 'is_active' => true, 'position' => 10]
        );

        $apartmentType = CatalogObjectType::firstOrCreate(
            ['code' => 'apartment'],
            ['name' => 'Квартира', 'description' => 'Квартира из фида apartments', 'is_active' => true, 'position' => 20]
        );

        $blockProps = [
            ['code' => 'address', 'name' => 'Адрес', 'data_type' => 'string', 'object_type_id' => $blockType->id, 'position' => 10],
            ['code' => 'district_id', 'name' => 'ID района', 'data_type' => 'string', 'object_type_id' => $blockType->id, 'position' => 20],
            ['code' => 'district_name', 'name' => 'Район', 'data_type' => 'string', 'object_type_id' => $blockType->id, 'position' => 30],
            ['code' => 'builder_id', 'name' => 'ID застройщика', 'data_type' => 'string', 'object_type_id' => $blockType->id, 'position' => 40],
            ['code' => 'builder_name', 'name' => 'Застройщик', 'data_type' => 'string', 'object_type_id' => $blockType->id, 'position' => 50],
            ['code' => 'lat', 'name' => 'Широта', 'data_type' => 'number', 'object_type_id' => $blockType->id, 'position' => 60],
            ['code' => 'lng', 'name' => 'Долгота', 'data_type' => 'number', 'object_type_id' => $blockType->id, 'position' => 70],
            ['code' => 'is_city', 'name' => 'В городе', 'data_type' => 'boolean', 'object_type_id' => $blockType->id, 'position' => 80],
            ['code' => 'status', 'name' => 'Статус', 'data_type' => 'number', 'object_type_id' => $blockType->id, 'position' => 90],
            ['code' => 'deadline_at', 'name' => 'Срок сдачи', 'data_type' => 'date', 'object_type_id' => $blockType->id, 'position' => 100],
            ['code' => 'min_price', 'name' => 'Мин. цена', 'data_type' => 'number', 'object_type_id' => $blockType->id, 'position' => 110],
            ['code' => 'max_price', 'name' => 'Макс. цена', 'data_type' => 'number', 'object_type_id' => $blockType->id, 'position' => 120],
            ['code' => 'min_area', 'name' => 'Мин. площадь', 'data_type' => 'number', 'object_type_id' => $blockType->id, 'position' => 130],
            ['code' => 'max_area', 'name' => 'Макс. площадь', 'data_type' => 'number', 'object_type_id' => $blockType->id, 'position' => 140],
            ['code' => 'images', 'name' => 'Фото', 'data_type' => 'json', 'object_type_id' => $blockType->id, 'position' => 150],
            ['code' => 'geometry_json', 'name' => 'Геометрия', 'data_type' => 'json', 'object_type_id' => $blockType->id, 'position' => 160],
        ];

        $apartmentProps = [
            ['code' => 'block_id', 'name' => 'ID ЖК', 'data_type' => 'string', 'object_type_id' => $apartmentType->id, 'position' => 10],
            ['code' => 'building_id', 'name' => 'ID корпуса', 'data_type' => 'string', 'object_type_id' => $apartmentType->id, 'position' => 20],
            ['code' => 'room', 'name' => 'Комнат', 'data_type' => 'number', 'object_type_id' => $apartmentType->id, 'position' => 30],
            ['code' => 'floor', 'name' => 'Этаж', 'data_type' => 'number', 'object_type_id' => $apartmentType->id, 'position' => 40],
            ['code' => 'floors_total', 'name' => 'Этажей всего', 'data_type' => 'number', 'object_type_id' => $apartmentType->id, 'position' => 50],
            ['code' => 'number', 'name' => 'Номер', 'data_type' => 'string', 'object_type_id' => $apartmentType->id, 'position' => 60],
            ['code' => 'area_total', 'name' => 'Площадь общая', 'data_type' => 'number', 'object_type_id' => $apartmentType->id, 'position' => 70],
            ['code' => 'area_living', 'name' => 'Жилая площадь', 'data_type' => 'number', 'object_type_id' => $apartmentType->id, 'position' => 80],
            ['code' => 'area_kitchen', 'name' => 'Кухня', 'data_type' => 'number', 'object_type_id' => $apartmentType->id, 'position' => 90],
            ['code' => 'price', 'name' => 'Цена', 'data_type' => 'number', 'object_type_id' => $apartmentType->id, 'position' => 100],
            ['code' => 'price_per_meter', 'name' => 'Цена за м²', 'data_type' => 'number', 'object_type_id' => $apartmentType->id, 'position' => 110],
            ['code' => 'finishing_id', 'name' => 'ID отделки', 'data_type' => 'string', 'object_type_id' => $apartmentType->id, 'position' => 120],
            ['code' => 'building_type_id', 'name' => 'ID типа дома', 'data_type' => 'string', 'object_type_id' => $apartmentType->id, 'position' => 130],
            ['code' => 'block_name', 'name' => 'Название ЖК', 'data_type' => 'string', 'object_type_id' => $apartmentType->id, 'position' => 140],
            ['code' => 'block_district_id', 'name' => 'ID района', 'data_type' => 'string', 'object_type_id' => $apartmentType->id, 'position' => 150],
            ['code' => 'block_district_name', 'name' => 'Район', 'data_type' => 'string', 'object_type_id' => $apartmentType->id, 'position' => 160],
            ['code' => 'block_builder_id', 'name' => 'ID застройщика', 'data_type' => 'string', 'object_type_id' => $apartmentType->id, 'position' => 170],
            ['code' => 'block_builder_name', 'name' => 'Застройщик', 'data_type' => 'string', 'object_type_id' => $apartmentType->id, 'position' => 180],
            ['code' => 'block_lat', 'name' => 'Широта ЖК', 'data_type' => 'number', 'object_type_id' => $apartmentType->id, 'position' => 190],
            ['code' => 'block_lng', 'name' => 'Долгота ЖК', 'data_type' => 'number', 'object_type_id' => $apartmentType->id, 'position' => 200],
            ['code' => 'building_deadline_at', 'name' => 'Срок сдачи', 'data_type' => 'date', 'object_type_id' => $apartmentType->id, 'position' => 210],
            ['code' => 'plan_url', 'name' => 'URL планировки', 'data_type' => 'string', 'object_type_id' => $apartmentType->id, 'position' => 220],
        ];

        foreach (array_merge($blockProps, $apartmentProps) as $p) {
            PropertyDefinition::firstOrCreate(
                ['code' => $p['code'], 'object_type_id' => $p['object_type_id']],
                array_merge($p, ['is_required' => false, 'is_filterable' => false, 'is_active' => true])
            );
        }
    }
}
