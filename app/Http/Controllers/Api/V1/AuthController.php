<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Authentication controller.
 *
 * Handles token-based authentication via Laravel Sanctum.
 * All responses use the ApiResponse trait envelope:
 *   { "success": true, "data": { ... } }
 *
 * Routes (prefix: /api/v1/auth):
 *   POST   /login   — issue a Bearer token
 *   POST   /logout  — revoke the current token  [auth:sanctum]
 *   GET    /me      — return authenticated user  [auth:sanctum]
 */
class AuthController extends Controller
{
    use ApiResponse;

    /**
     * Issue a Sanctum personal access token.
     *
     * Validates credentials via Auth::attempt(). On success creates a
     * personal_access_token record and returns the plain-text token
     * (shown only once — not stored in DB, only its hash is).
     *
     * @throws \Illuminate\Validation\ValidationException  422 on bad credentials
     *
     * @return JsonResponse  200: { success, data: { user, token } }
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $token = $user->createToken('api-token')->plainTextToken;

        return $this->success([
            'user'  => $user,
            'token' => $token,
        ], 'Login successful');
    }

    /**
     * Register a new user and issue token.
     */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => 'user',
        ]);

        $token = $user->createToken('api-token')->plainTextToken;

        return $this->success([
            'user' => $user,
            'token' => $token,
        ], 'Registration successful');
    }

    /**
     * Send password reset link to email.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $status = Password::sendResetLink([
            'email' => $data['email'],
        ]);

        if ($status !== Password::RESET_LINK_SENT) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return $this->success(null, __($status));
    }

    /**
     * Reset password by token and email.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required', 'string'],
        ]);

        $status = Password::reset(
            [
                'email' => $data['email'],
                'password' => $data['password'],
                'password_confirmation' => $data['password_confirmation'],
                'token' => $data['token'],
            ],
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                $user->tokens()->delete();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return $this->success(null, __($status));
    }

    /**
     * Revoke the current Bearer token.
     *
     * Deletes the personal_access_token row from the database.
     * Subsequent requests with this token will receive 401.
     *
     * @return JsonResponse  200: { success, message: "Logged out successfully", data: null }
     */
    public function logout(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if ($user) {
            $user->currentAccessToken()->delete();
        }

        return $this->success(null, 'Logged out successfully');
    }

    /**
     * Return the currently authenticated user.
     *
     * Resolved from the Bearer token via Sanctum middleware.
     * No DB query beyond token validation (user already loaded by middleware).
     *
     * @return JsonResponse  200: { success, data: User }
     */
    public function me(Request $request): JsonResponse
    {
        return $this->success($request->user());
    }
}
