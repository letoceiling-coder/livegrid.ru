<?php

use App\Http\Controllers\Api\V1\ApartmentController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BlockController;
use App\Http\Controllers\Api\V1\FilterController;
use App\Http\Controllers\Api\V1\MediaController;
use App\Http\Controllers\Api\V1\NewsController;
use App\Http\Controllers\Api\V1\PageController;
use App\Http\Controllers\Api\V1\PublicPageController;
use App\Http\Controllers\Api\V1\SectionController;
use App\Http\Controllers\Api\V1\SearchController;
use App\Http\Controllers\Api\V1\SimilarController;
use App\Http\Controllers\Api\V1\StatsController;
use App\Http\Controllers\Api\V1\LeadController;
use App\Http\Controllers\Api\V1\CrmUserController;
use App\Http\Controllers\Api\V1\CrmRoleController;
use App\Http\Controllers\Api\V1\CrmDictionaryController;
use App\Http\Controllers\Api\V1\CrmCatalogController;
use App\Http\Controllers\Api\V1\CrmFeedController;
use App\Http\Controllers\Api\V1\CrmObjectController;
use App\Http\Controllers\Api\V1\CrmObjectTypeController;
use App\Http\Controllers\Api\V1\CrmPropertyController;
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
        ->where('id', '(?:[a-z0-9-]+-[a-f0-9]{24}|[a-f0-9]{24})');
    Route::get('/blocks/{id}/apartments', [BlockController::class, 'apartments'])
        ->where('id', '(?:[a-z0-9-]+-[a-f0-9]{24}|[a-f0-9]{24})');

    // Similar (related items)
    Route::get('/apartments/{id}/similar', [SimilarController::class, 'apartments'])
        ->where('id', '[a-f0-9]{24}');
    Route::get('/blocks/{id}/similar', [SimilarController::class, 'blocks'])
        ->where('id', '(?:[a-z0-9-]+-[a-f0-9]{24}|[a-f0-9]{24})');

    // Filters (shared filter options for frontend)
    Route::get('/filters', [FilterController::class, 'index']);

    // Live search (ЖК + квартиры)
    Route::get('/search', [SearchController::class, 'index']);

    // Statistics (platform stats for homepage)
    Route::get('/stats/platform', [StatsController::class, 'platform']);
    Route::get('/stats/general', [StatsController::class, 'general']);

    // News
    Route::get('/news', [NewsController::class, 'index']);
    Route::get('/news/categories', [NewsController::class, 'categories']);
    Route::get('/news/{slug}', [NewsController::class, 'show']);

    // Leads (ипотека, подбор и т.д.)
    Route::post('/leads', [LeadController::class, 'store']);

    // -------------------------------------------------------------------------
    // Auth routes
    // -------------------------------------------------------------------------
    Route::prefix('auth')->group(function () {
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('/reset-password', [AuthController::class, 'resetPassword']);
        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::get('/me', [AuthController::class, 'me']);
        });
    });

    // -------------------------------------------------------------------------
    // Admin routes (Sanctum token required)
    // -------------------------------------------------------------------------
    Route::middleware(['auth:sanctum', 'admin'])
        ->prefix('admin')
        ->group(function () {
            Route::apiResource('pages', PageController::class);
            Route::apiResource('sections', SectionController::class);
            Route::apiResource('media', MediaController::class);
        });

    // -------------------------------------------------------------------------
    // CRM routes (Sanctum token + admin role required)
    // -------------------------------------------------------------------------
    Route::middleware(['auth:sanctum', 'admin'])
        ->prefix('crm')
        ->group(function () {
            // Users + roles
            Route::get('/users', [CrmUserController::class, 'index']);
            Route::post('/users', [CrmUserController::class, 'store']);
            Route::put('/users/{user}', [CrmUserController::class, 'update']);
            Route::delete('/users/{user}', [CrmUserController::class, 'destroy']);
            Route::get('/roles', [CrmRoleController::class, 'index']);

            // Dictionaries CRUD
            Route::get('/dictionaries/{entity}', [CrmDictionaryController::class, 'index']);
            Route::post('/dictionaries/{entity}', [CrmDictionaryController::class, 'store']);
            Route::put('/dictionaries/{entity}/{id}', [CrmDictionaryController::class, 'update']);
            Route::delete('/dictionaries/{entity}/{id}', [CrmDictionaryController::class, 'destroy']);

            // Catalog entities CRUD
            Route::get('/catalog/{entity}', [CrmCatalogController::class, 'index']);
            Route::post('/catalog/{entity}', [CrmCatalogController::class, 'store']);
            Route::put('/catalog/{entity}/{id}', [CrmCatalogController::class, 'update']);
            Route::delete('/catalog/{entity}/{id}', [CrmCatalogController::class, 'destroy']);

            // Object types CRUD
            Route::get('/object-types', [CrmObjectTypeController::class, 'index']);
            Route::post('/object-types', [CrmObjectTypeController::class, 'store']);
            Route::put('/object-types/{objectType}', [CrmObjectTypeController::class, 'update']);
            Route::delete('/object-types/{objectType}', [CrmObjectTypeController::class, 'destroy']);

            // Internal CRM objects CRUD
            Route::get('/objects', [CrmObjectController::class, 'index']);
            Route::post('/objects', [CrmObjectController::class, 'store']);
            Route::put('/objects/{object}', [CrmObjectController::class, 'update']);
            Route::delete('/objects/{object}', [CrmObjectController::class, 'destroy']);

            // Property definitions + options + object values
            Route::get('/properties/definitions', [CrmPropertyController::class, 'indexDefinitions']);
            Route::post('/properties/definitions', [CrmPropertyController::class, 'storeDefinition']);
            Route::put('/properties/definitions/{definition}', [CrmPropertyController::class, 'updateDefinition']);
            Route::delete('/properties/definitions/{definition}', [CrmPropertyController::class, 'destroyDefinition']);

            Route::get('/properties/definitions/{definition}/options', [CrmPropertyController::class, 'listOptions']);
            Route::post('/properties/definitions/{definition}/options', [CrmPropertyController::class, 'storeOption']);
            Route::put('/properties/definitions/{definition}/options/{option}', [CrmPropertyController::class, 'updateOption']);
            Route::delete('/properties/definitions/{definition}/options/{option}', [CrmPropertyController::class, 'destroyOption']);

            Route::get('/objects/{object}/properties', [CrmPropertyController::class, 'listObjectValues']);
            Route::post('/objects/{object}/properties', [CrmPropertyController::class, 'upsertObjectValues']);

            // Feed management
            Route::post('/feed/run', [CrmFeedController::class, 'run']);
        });
});
