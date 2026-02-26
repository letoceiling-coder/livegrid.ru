<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\MediaController;
use App\Http\Controllers\Api\V1\PageController;
use App\Http\Controllers\Api\V1\PublicPageController;
use App\Http\Controllers\Api\V1\SectionController;
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
