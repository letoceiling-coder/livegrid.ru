<?php

use App\Http\Controllers\Api\V1\ApartmentController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BlockController;
use App\Http\Controllers\Api\V1\FilterController;
use App\Http\Controllers\Api\V1\MediaController;
use App\Http\Controllers\Api\V1\PageController;
use App\Http\Controllers\Api\V1\PublicPageController;
use App\Http\Controllers\Api\V1\SectionController;
use App\Http\Controllers\Api\V1\SimilarController;
use App\Http\Controllers\Api\V1\StatsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - v1
|--------------------------------------------------------------------------
|
| All routes are prefixed with /api/v1 automatically.
| No web middleware. No Blade. No SSR.
| Authentication via Laravel Sanctum tokens.
|
*/

Route::prefix('v1')->group(function () {

    // -------------------------------------------------------------------------
    // Public routes (no auth required)
    // -------------------------------------------------------------------------
    Route::get('/pages/{slug}', [PublicPageController::class, 'show'])
        ->where('slug', '[a-z0-9-]+');

    // ── Real estate API ──────────────────────────────────────────────────────

    // Apartments
    Route::get('/apartments', [ApartmentController::class, 'index']);
    Route::get('/apartments/{id}', [ApartmentController::class, 'show'])
        ->where('id', '[a-f0-9]{24}');

    // Blocks (ЖК / residential complexes)
    Route::get('/blocks', [BlockController::class, 'index']);
    Route::get('/blocks/filters', [BlockController::class, 'filters']);
    Route::get('/blocks/map', [BlockController::class, 'forMap']);
    Route::get('/blocks/{id}', [BlockController::class, 'show'])
        ->where('id', '[a-f0-9]{24}');
    Route::get('/blocks/{id}/apartments', [BlockController::class, 'apartments'])
        ->where('id', '[a-f0-9]{24}');

    // Similar (related items)
    Route::get('/apartments/{id}/similar', [SimilarController::class, 'apartments'])
        ->where('id', '[a-f0-9]{24}');
    Route::get('/blocks/{id}/similar', [SimilarController::class, 'blocks'])
        ->where('id', '[a-f0-9]{24}');

    // Filters (shared filter options for frontend)
    Route::get('/filters', [FilterController::class, 'index']);

    // Statistics (platform stats for homepage)
    Route::get('/stats/platform', [StatsController::class, 'platform']);
    Route::get('/stats/general', [StatsController::class, 'general']);

    // -------------------------------------------------------------------------
    // Auth routes
    // -------------------------------------------------------------------------
    Route::prefix('auth')->group(function () {
        Route::post('/login', [AuthController::class, 'login']);
        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::get('/me', [AuthController::class, 'me']);
        });
    });

    // -------------------------------------------------------------------------
    // Admin routes (Sanctum token required)
    // -------------------------------------------------------------------------
    Route::middleware('auth:sanctum')
        ->prefix('admin')
        ->group(function () {
            Route::apiResource('pages', PageController::class);
            Route::apiResource('sections', SectionController::class);
            Route::apiResource('media', MediaController::class);
        });
});
