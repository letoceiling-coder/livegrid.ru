<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Apartment;
use App\Models\User;
use App\Models\Block;
use Illuminate\Http\JsonResponse;

class StatsController extends Controller
{
    /**
     * GET /api/v1/stats/platform
     * 
     * Возвращает общую статистику платформы:
     * - Количество объектов (квартир)
     * - Количество пользователей
     * - Количество регионов
     * - Количество лет на рынке (статично)
     */
    public function platform(): JsonResponse
    {
        $stats = [
            'total_objects' => Apartment::where('is_deleted', 0)->count(),
            'total_users' => User::count(),
            'total_regions' => Block::distinct('district_id')->whereNotNull('district_id')->count(),
            'years_on_market' => 10, // Статичное значение
        ];

        return response()->json($stats);
    }

    /**
     * GET /api/v1/stats/general
     * 
     * Возвращает общую статистику для hero секции:
     * - Общее количество квартир
     * - Общее количество жилых комплексов
     */
    public function general(): JsonResponse
    {
        $stats = [
            'total_apartments' => Apartment::where('is_deleted', 0)->count(),
            'total_blocks' => Block::where('status', 1)->count(), // status = 1 (активные)
        ];

        return response()->json($stats);
    }
}
