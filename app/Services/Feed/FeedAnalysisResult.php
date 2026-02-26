<?php

namespace App\Services\Feed;

/**
 * Immutable summary DTO returned by FeedAnalyzer::analyze().
 *
 * Carries all statistics collected during one analysis run
 * for a single feed endpoint. Passed to FeedAnalyzeCommand
 * for console output rendering.
 */
final readonly class FeedAnalysisResult
{
    public function __construct(
        /** Feed endpoint URL */
        public string $url,

        /** Short human-readable label */
        public string $label,

        /** ID of the inserted feed_raw_snapshots row */
        public int $snapshotId,

        /** HTTP status code from feed server */
        public int $httpStatus,

        /** Time to download the feed in seconds */
        public float $downloadSeconds,

        /** Raw payload size in bytes */
        public int $payloadBytes,

        /** Whether payload changed since the previous run */
        public bool $isChanged,

        /** Count of root-level objects (largest array detected) */
        public int $objectsCount,

        /** Count of ЖК / projects */
        public int $projectsCount,

        /** Count of buildings / корпуса */
        public int $buildingsCount,

        /** Count of apartments / квартиры */
        public int $apartmentsCount,

        /** Number of unique field paths discovered in the schema */
        public int $uniquePaths,

        /** Fields per depth level: [depth => count] */
        public array $depthStats,

        /** Field count per type: ['string' => 120, 'int' => 45, ...] */
        public array $typeDistribution,
    ) {}

    /**
     * Human-readable payload size (e.g. "12.4 MB").
     */
    public function payloadHumanSize(): string
    {
        $bytes = $this->payloadBytes;

        if ($bytes >= 1024 * 1024) {
            return round($bytes / (1024 * 1024), 2) . ' MB';
        }

        if ($bytes >= 1024) {
            return round($bytes / 1024, 1) . ' KB';
        }

        return $bytes . ' B';
    }
}
