<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class CrmRoleController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        return $this->success([
            ['value' => 'admin', 'label' => 'Администратор'],
            ['value' => 'editor', 'label' => 'Редактор'],
            ['value' => 'author', 'label' => 'Автор'],
            ['value' => 'viewer', 'label' => 'Наблюдатель'],
            ['value' => 'user', 'label' => 'Пользователь'],
        ]);
    }
}

