<?php

namespace App\Services\Feed;

use Illuminate\Support\Facades\Log;

/**
 * Feed analysis orchestrator.
 *
 * Coordinates the full analysis pipeline for a single feed endpoint:
 *   1. Download via FeedClient
 *   2. Parse JSON
 *   3. Persist raw snapshot via FeedStorageService
 *   4. Run schema inspection via FeedSchemaInspector
 *   5. Return a FeedAnalysisResult summary DTO
 *
 * The caller (FeedAnalyzeCommand) runs this for each configured endpoint
 * and renders the results to the console.
 *
 * IMPORTANT: This class must NOT contain any business-domain logic.
 * It only collects, measures, and stores. Data modeling happens later.
 */
final class FeedAnalyzer
{
    public function __construct(
        private readonly FeedClient $client,
        private readonly FeedStorageService $storage,
        private readonly FeedSchemaInspector $inspector,
    ) {}

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Run the full analysis pipeline for one endpoint.
     *
     * @param  string $url  Feed endpoint URL
     * @return FeedAnalysisResult
     *
     * @throws \RuntimeException  Propagated from FeedClient if all retries fail
     * @throws \JsonException     If response body is not valid JSON
     */
    public function analyze(string $url): FeedAnalysisResult
    {
        Log::channel('feed')->info("FeedAnalyzer: starting analysis for {$url}");

        // ── Step 1: Download ──────────────────────────────────────────────────
        $fetchResult = $this->client->fetch($url);

        // ── Step 2: Parse JSON ────────────────────────────────────────────────
        Log::channel('feed')->info('FeedAnalyzer: parsing JSON...');
        $decoded = $fetchResult->decoded();

        // ── Step 3: Raw snapshot ──────────────────────────────────────────────
        Log::channel('feed')->info('FeedAnalyzer: saving raw snapshot...');
        $snapshotId = $this->storage->saveSnapshot($fetchResult, $decoded);
        $counts     = $this->storage->countObjects($decoded);

        // ── Step 4: Schema inspection ─────────────────────────────────────────
        Log::channel('feed')->info('FeedAnalyzer: inspecting schema...');
        $resetOnRun  = (bool) config('feed.schema.reset_on_each_run', false);
        $uniquePaths = $this->inspector->inspect($url, $decoded, $resetOnRun);

        // Collect per-depth statistics from the field map
        $fieldMap        = $this->inspector->getFieldMap();
        $depthStats      = $this->buildDepthStats($fieldMap);
        $typeDistribution= $this->buildTypeDistribution($fieldMap);

        $result = new FeedAnalysisResult(
            url:              $url,
            label:            $fetchResult->label,
            snapshotId:       $snapshotId,
            httpStatus:       $fetchResult->httpStatus,
            downloadSeconds:  $fetchResult->downloadSeconds,
            payloadBytes:     $fetchResult->sizeBytes(),
            isChanged:        $this->storage->isChanged($url, $fetchResult->checksum()),
            objectsCount:     $counts['objects'],
            projectsCount:    $counts['projects'],
            buildingsCount:   $counts['buildings'],
            apartmentsCount:  $counts['apartments'],
            uniquePaths:      $uniquePaths,
            depthStats:       $depthStats,
            typeDistribution: $typeDistribution,
        );

        Log::channel('feed')->info('FeedAnalyzer: analysis complete', [
            'snapshot_id'    => $snapshotId,
            'unique_paths'   => $uniquePaths,
            'objects'        => $counts['objects'],
            'projects'       => $counts['projects'],
            'buildings'      => $counts['buildings'],
            'apartments'     => $counts['apartments'],
        ]);

        return $result;
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    /**
     * Count how many unique fields exist at each depth level.
     *
     * Example output: [0 => 3, 1 => 12, 2 => 47, ...]
     *
     * @param  array<string, array{depth:int}> $fieldMap
     * @return array<int, int>
     */
    private function buildDepthStats(array $fieldMap): array
    {
        $stats = [];
        foreach ($fieldMap as $entry) {
            $depth = $entry['depth'];
            $stats[$depth] = ($stats[$depth] ?? 0) + 1;
        }
        ksort($stats);
        return $stats;
    }

    /**
     * Count how many fields of each type were found.
     *
     * Example output: ['string' => 120, 'int' => 45, 'array' => 12, ...]
     *
     * @param  array<string, array{type:string}> $fieldMap
     * @return array<string, int>
     */
    private function buildTypeDistribution(array $fieldMap): array
    {
        $dist = [];
        foreach ($fieldMap as $entry) {
            $type = $entry['type'];
            $dist[$type] = ($dist[$type] ?? 0) + 1;
        }
        arsort($dist);
        return $dist;
    }
}
