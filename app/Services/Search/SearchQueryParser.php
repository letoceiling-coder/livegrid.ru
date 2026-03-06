<?php

namespace App\Services\Search;

/**
 * Extracts structured filters from natural language search queries.
 *
 * Example: "1 комнатная сокольники до 10 млн" →
 *   rooms: [1],
 *   district: "сокольники",
 *   price_max: 10000000,
 *   text: "сокольники"
 */
class SearchQueryParser
{
    /** Room mappings: query terms → room count (0 = studio) */
    private const ROOM_PATTERNS = [
        // studio
        '/студи[яиюй]/ui' => 0,
        '/студия/ui'      => 0,
        // 1-room
        '/1\s*[-]?\s*комнатн/ui' => 1,
        '/1к\b/ui'                => 1,
        '/1\s*[-]?к\.?\b/ui'      => 1,
        '/однокомнатн/ui'         => 1,
        // 2-room
        '/2\s*[-]?\s*комнатн/ui' => 2,
        '/2к\b/ui'                => 2,
        '/2\s*[-]?к\.?\b/ui'      => 2,
        '/двухкомнатн/ui'         => 2,
        // 3-room
        '/3\s*[-]?\s*комнатн/ui' => 3,
        '/3к\b/ui'                => 3,
        '/3\s*[-]?к\.?\b/ui'      => 3,
        '/трехкомнатн/ui'         => 3,
        '/трёхкомнатн/ui'         => 3,
        // 4-room
        '/4\s*[-]?\s*комнатн/ui' => 4,
        '/4к\b/ui'                => 4,
        // 5+ room
        '/5\s*[-]?\s*комнатн/ui' => 5,
        '/5к\b/ui'                => 5,
    ];

    /**
     * Parse a search query and extract structured filters + remaining text.
     *
     * @return array{
     *   text: string,
     *   rooms: int[],
     *   price_min: int|null,
     *   price_max: int|null,
     *   area_min: float|null,
     *   area_max: float|null,
     *   district: string|null,
     *   raw: string
     * }
     */
    public function parse(string $query): array
    {
        $raw = $query;
        $query = trim(preg_replace('/\s+/u', ' ', $query));
        $text = $query;

        $rooms = $this->extractRooms($query, $text);
        $priceMin = $this->extractPriceMin($query, $text);
        $priceMax = $this->extractPriceMax($query, $text);
        $areaMin = $this->extractAreaMin($query, $text);
        $areaMax = $this->extractAreaMax($query, $text);

        // Clean text: remove matched patterns, collapse spaces
        $text = preg_replace('/\s+/u', ' ', trim($text));
        $text = $text !== '' ? $text : $query; // If we stripped everything, use original

        return [
            'text'      => $text,
            'rooms'     => $rooms,
            'price_min' => $priceMin,
            'price_max' => $priceMax,
            'area_min'  => $areaMin,
            'area_max'  => $areaMax,
            'district'  => null, // District stays in text for FULLTEXT match
            'raw'       => $raw,
        ];
    }

    /**
     * @return int[]
     */
    private function extractRooms(string $query, string &$text): array
    {
        $rooms = [];
        foreach (self::ROOM_PATTERNS as $pattern => $room) {
            if (preg_match($pattern, $query)) {
                $rooms[] = $room;
                $text = preg_replace($pattern, ' ', $text);
            }
        }
        return array_values(array_unique($rooms));
    }

    private function extractPriceMax(string $query, string &$text): ?int
    {
        // "до 10 млн", "до 8 миллионов", "до 5м", "до 5 м", "до 5000000"
        if (preg_match('/до\s+(\d+(?:[.,]\d+)?)\s*(?:млн|миллионов?|м\.?|млн\.?)/ui', $query, $m)) {
            $text = preg_replace('/до\s+\d+(?:[.,]\d+)?\s*(?:млн|миллионов?|м\.?|млн\.?)/ui', ' ', $text);
            $val = (float) str_replace(',', '.', $m[1]);
            return $val >= 1 ? (int) round($val * 1_000_000) : (int) $val;
        }
        if (preg_match('/до\s+(\d+)\s*$/ui', trim($query), $m)) {
            $val = (int) $m[1];
            if ($val > 1000) { // Likely rubles
                $text = preg_replace('/до\s+\d+\s*$/ui', ' ', $text);
                return $val;
            }
        }
        return null;
    }

    private function extractPriceMin(string $query, string &$text): ?int
    {
        // "от 5 млн", "от 3 миллионов"
        if (preg_match('/от\s+(\d+(?:[.,]\d+)?)\s*(?:млн|миллионов?|м\.?|млн\.?)/ui', $query, $m)) {
            $text = preg_replace('/от\s+\d+(?:[.,]\d+)?\s*(?:млн|миллионов?|м\.?|млн\.?)/ui', ' ', $text);
            $val = (float) str_replace(',', '.', $m[1]);
            return $val >= 1 ? (int) round($val * 1_000_000) : (int) $val;
        }
        return null;
    }

    private function extractAreaMin(string $query, string &$text): ?float
    {
        // "40м", "40 м", "40 метров", "40 кв.м", "от 40"
        if (preg_match('/(?:от\s+)?(\d+(?:[.,]\d+)?)\s*(?:кв\.?\s*м|м²|м2|метров?|м\b)/ui', $query, $m)) {
            $text = preg_replace('/(?:от\s+)?\d+(?:[.,]\d+)?\s*(?:кв\.?\s*м|м²|м2|метров?|м\b)/ui', ' ', $text);
            return (float) str_replace(',', '.', $m[1]);
        }
        return null;
    }

    private function extractAreaMax(string $query, string &$text): ?float
    {
        // "до 60 м", "до 50 метров"
        if (preg_match('/до\s+(\d+(?:[.,]\d+)?)\s*(?:кв\.?\s*м|м²|м2|метров?|м\b)/ui', $query, $m)) {
            $text = preg_replace('/до\s+\d+(?:[.,]\d+)?\s*(?:кв\.?\s*м|м²|м2|метров?|м\b)/ui', ' ', $text);
            return (float) str_replace(',', '.', $m[1]);
        }
        return null;
    }
}
