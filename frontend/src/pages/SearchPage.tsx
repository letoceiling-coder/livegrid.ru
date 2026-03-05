/**
 * Search results page — GET /api/v1/search?q=
 * Uses useSearch (debounced) via API layer.
 */

import { useSearchParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useSearch } from '@/hooks/useSearch';
import { Building2, Home } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const formatPrice = (price: number | null) =>
  price != null ? `${(price / 1_000_000).toFixed(1)} млн` : '—';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const navigate = useNavigate();
  const { results, loading, error, isEmpty } = useSearch(query);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">
          {query ? `Поиск: «${query}»` : 'Поиск'}
        </h1>
        {!query && (
          <p className="text-muted-foreground text-sm">Введите запрос в строку поиска.</p>
        )}
        {error && (
          <p className="text-destructive text-sm mb-4">{error}</p>
        )}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}
        {!loading && results && query.length >= 2 && (
          <div className="space-y-6">
            {results.residential_complexes.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Жилые комплексы
                </h2>
                <ul className="space-y-2">
                  {results.residential_complexes.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card text-left hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/complex/${b.slug}`)}
                      >
                        <Building2 className="w-5 h-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{b.name}</div>
                          {b.subtitle && (
                            <div className="text-sm text-muted-foreground truncate">{b.subtitle}</div>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {results.apartments.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Квартиры
                </h2>
                <ul className="space-y-2">
                  {results.apartments.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-border bg-card text-left hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/apartment/${a.id}`)}
                      >
                        <Home className="w-5 h-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{a.title}</div>
                          {a.block_name && (
                            <div className="text-sm text-muted-foreground truncate">{a.block_name}</div>
                          )}
                        </div>
                        <span className="font-medium shrink-0">{formatPrice(a.price)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {isEmpty && (
              <p className="text-muted-foreground py-8 text-center">Ничего не найдено</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
