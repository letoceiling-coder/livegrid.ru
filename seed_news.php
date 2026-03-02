<?php

use App\Models\News;
use Illuminate\Support\Str;

$newsData = [
    ['title' => 'Обзор новостроек Москвы 2026', 'slug' => 'obzor-novostroek-moskvy-2026', 'category' => 'Обзор', 'excerpt' => 'Полный обзор новых жилых комплексов в Москве на 2026 год'],
    ['title' => 'Ипотечные ставки снижены до 6%', 'slug' => 'ipotechnye-stavki-snizheny-do-6', 'category' => 'Ипотека', 'excerpt' => 'Банки объявили о снижении ставок по ипотечным кредитам'],
    ['title' => 'Новый жилой комплекс на юге Москвы', 'slug' => 'novyj-zhiloj-kompleks-na-yuge-moskvy', 'category' => 'Новостройки', 'excerpt' => 'Открытие нового жилого комплекса с развитой инфраструктурой'],
    ['title' => 'Как выбрать квартиру в 2026 году', 'slug' => 'kak-vybrat-kvartiru-v-2026-godu', 'category' => 'Советы', 'excerpt' => 'Практические советы по выбору квартиры'],
    ['title' => 'Рынок коммерческой недвижимости растёт', 'slug' => 'rynok-kommercheskoj-nedvizhimosti-rastyot', 'category' => 'Аналитика', 'excerpt' => 'Аналитика рынка коммерческой недвижимости за 2025 год'],
    ['title' => 'Программа реновации: итоги 2025', 'slug' => 'programma-renovacii-itogi-2025', 'category' => 'Реновация', 'excerpt' => 'Подведены итоги программы реновации за прошедший год'],
    ['title' => 'Тренды дизайна интерьера 2026', 'slug' => 'trendy-dizajna-interera-2026', 'category' => 'Дизайн', 'excerpt' => 'Актуальные тренды в дизайне интерьеров'],
    ['title' => 'Загородная недвижимость: спрос растёт', 'slug' => 'zagorodnaya-nedvizhimost-spros-rastyot', 'category' => 'Загород', 'excerpt' => 'Анализ роста спроса на загородную недвижимость'],
];

foreach ($newsData as $item) {
    News::create([
        'id' => (string) Str::uuid(),
        'title' => $item['title'],
        'slug' => $item['slug'],
        'category' => $item['category'],
        'excerpt' => $item['excerpt'],
        'published_at' => now(),
        'is_published' => true,
    ]);
}

echo "Created " . count($newsData) . " news items\n";
