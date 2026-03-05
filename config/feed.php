<?php

/**
 * Feed configuration — livegrid.ru real-estate data import.
 *
 * IMPORTANT:
 *   Feed endpoints are only accessible from server IP 85.198.64.93.
 *   Do NOT call these URLs from local machine — access will be denied.
 *
 * Add actual endpoint URLs to .env:
 *   FEED_ENDPOINT_PRIMARY=https://...
 *   FEED_ENDPOINT_SECONDARY=https://...   (optional)
 *   FEED_AUTH_TOKEN=your_token_here       (if required)
 */

return [

    /*
    |--------------------------------------------------------------------------
    | Feed endpoints
    |--------------------------------------------------------------------------
    |
    | Array of endpoints to analyze. Each entry is processed independently.
    | Add as many as needed — each produces its own feed_raw_snapshot row.
    |
    */
    'endpoints' => array_filter([
        env('FEED_ENDPOINT_PRIMARY'),
        env('FEED_ENDPOINT_SECONDARY'),
        env('FEED_ENDPOINT_TERTIARY'),
    ]),

    /*
    |--------------------------------------------------------------------------
    | HTTP client settings
    |--------------------------------------------------------------------------
    */
    'http' => [
        'timeout'        => (int) env('FEED_HTTP_TIMEOUT', 120),   // seconds
        'retry_times'    => (int) env('FEED_HTTP_RETRY_TIMES', 3),
        'retry_sleep_ms' => (int) env('FEED_HTTP_RETRY_SLEEP', 2000), // ms between retries
        'verify_ssl'     => (bool) env('FEED_HTTP_VERIFY_SSL', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    |
    | Supported modes: 'none', 'bearer', 'basic', 'query'
    |   bearer  → Authorization: Bearer <token>
    |   basic   → Authorization: Basic base64(user:pass)
    |   query   → ?token=<token>  (appended to URL)
    |
    */
    'auth' => [
        'mode'     => env('FEED_AUTH_MODE', 'none'),
        'token'    => env('FEED_AUTH_TOKEN'),
        'username' => env('FEED_AUTH_USER'),
        'password' => env('FEED_AUTH_PASS'),
        'param'    => env('FEED_AUTH_PARAM', 'token'),  // for mode=query
    ],

    /*
    |--------------------------------------------------------------------------
    | Schema inspector settings
    |--------------------------------------------------------------------------
    */
    'schema' => [
        // Max depth to recurse into nested objects
        'max_depth'          => (int) env('FEED_SCHEMA_MAX_DEPTH', 10),

        // Max array items to inspect per field (avoids scanning 10k apartments)
        'array_sample_size'  => (int) env('FEED_SCHEMA_ARRAY_SAMPLE', 5),

        // Max length of stored example_value strings
        'example_max_length' => (int) env('FEED_SCHEMA_EXAMPLE_LEN', 200),

        // Reset analysis table on each run vs accumulate (true = full re-analysis)
        'reset_on_each_run'  => (bool) env('FEED_SCHEMA_RESET', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Storage
    |--------------------------------------------------------------------------
    */
    'storage' => [
        // Keep last N raw snapshots per endpoint (0 = keep all)
        'keep_snapshots'     => (int) env('FEED_KEEP_SNAPSHOTS', 10),

        // Store raw payload in DB (true) or only metadata (false)
        'save_payload'       => (bool) env('FEED_SAVE_PAYLOAD', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Known structural hints
    |--------------------------------------------------------------------------
    |
    | Optional: known top-level keys to count for the statistics summary.
    | Leave empty — FeedAnalyzer will auto-detect root arrays.
    |
    */
    'hints' => [
        'projects_key'    => env('FEED_HINT_PROJECTS',    ''),   // e.g. "projects"
        'buildings_key'   => env('FEED_HINT_BUILDINGS',   ''),   // e.g. "buildings"
        'apartments_key'  => env('FEED_HINT_APARTMENTS',  ''),   // e.g. "apartments"
    ],
];
