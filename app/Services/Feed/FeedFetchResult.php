<?php

namespace App\Services\Feed;

/**
 * Value object returned by FeedClient::fetch().
 *
 * Immutable DTO carrying the raw HTTP response and its metadata.
 * Passed between FeedClient → FeedStorageService → FeedSchemaInspector.
 */
final readonly class FeedFetchResult
{
    public function __construct(
        /** Full endpoint URL */
        public string $url,

        /** Short human-readable label derived from URL */
        public string $label,

        /** Raw response body (JSON string) */
        public string $body,

        /** HTTP response status code */
        public int $httpStatus,

        /** Time to download in seconds */
        public float $downloadSeconds,
    ) {}

    /**
     * Parse and return the decoded JSON payload.
     *
     * @return array<string, mixed>
     * @throws \JsonException  If body is not valid JSON
     */
    public function decoded(): array
    {
        return json_decode($this->body, true, 512, JSON_THROW_ON_ERROR);
    }

    /**
     * SHA-1 checksum of the raw body.
     * Used to detect whether the feed changed between runs.
     */
    public function checksum(): string
    {
        return sha1($this->body);
    }

    /**
     * Size of raw payload in bytes.
     */
    public function sizeBytes(): int
    {
        return strlen($this->body);
    }

    /**
     * Human-readable payload size (e.g. "12.4 MB").
     */
    public function payloadHumanSize(): string
    {
        $bytes = $this->sizeBytes();

        if ($bytes >= 1024 * 1024) {
            return round($bytes / (1024 * 1024), 2) . ' MB';
        }

        if ($bytes >= 1024) {
            return round($bytes / 1024, 1) . ' KB';
        }

        return $bytes . ' B';
    }
}
