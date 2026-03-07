<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class CrmFeedController extends Controller
{
    use ApiResponse;

    public function run(Request $request): JsonResponse
    {
        $data = $request->validate([
            'command' => ['required', 'string', 'in:feed:collect,feed:inspect,feed:analyze,feed:sync,catalog:sync-from-legacy'],
        ]);

        Artisan::call($data['command']);
        $output = Artisan::output();

        return $this->success([
            'command' => $data['command'],
            'exit_code' => 0,
            'output' => $output,
        ], 'Команда фида выполнена');
    }
}

