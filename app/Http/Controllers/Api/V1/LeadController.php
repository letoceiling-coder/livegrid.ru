<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'string', 'regex:/^\+7\d{10}$/'],
            'source' => ['nullable', 'string', 'max:50'],
        ]);

        Lead::create([
            'phone' => $validated['phone'],
            'source' => $validated['source'] ?? 'ipoteka',
        ]);

        return response()->json(['success' => true, 'message' => 'Заявка принята']);
    }
}
