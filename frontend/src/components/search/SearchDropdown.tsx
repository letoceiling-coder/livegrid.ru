import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import type { SearchResults } from '@/hooks/useLiveSearch';

interface SearchDropdownProps {
  open: boolean;
  loading: boolean;
  results: SearchResults | null;
  error: string | null;
  onSelect: () => void;
}

const formatPrice = (price: number | null) =>
  price != null
    ? `${(price / 1_000_000).toFixed(1)} млн`
    : '—';

export default function SearchDropdown({
  open,
  loading,
  results,
  error,
  onSelect,
}: SearchDropdownProps) {
  const navigate = useNavigate();

  if (!open) return null;

  const hasZhk = (results?.residential_complexes?.length ?? 0) > 0;
  const hasApts = (results?.apartments?.length ?? 0) > 0;
  const empty = !loading && !error && results && !hasZhk && !hasApts;

  return (
    <div
      className="absolute left-0 right-0 top-full mt-2 w-full rounded-xl border border-border bg-background shadow-lg max-h-80 overflow-y-auto z-50"
      role="listbox"
    >
      {loading && (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          Поиск...
        </div>
      )}
      {error && (
        <div className="px-4 py-6 text-center text-sm text-destructive">
          {error}
        </div>
      )}
      {empty && (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          Ничего не найдено
        </div>
      )}
      {!loading && !error && results && (hasZhk || hasApts) && (
        <div className="py-2">
          {hasZhk && (
            <div className="px-3 py-1.5">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Жилые комплексы
              </div>
              {results.residential_complexes.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="option"
                  className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => {
                    navigate(`/zhk/${b.slug}`);
                    onSelect();
                  }}
                >
                  <Building2 className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{b.name}</div>
                    {b.subtitle && (
                      <div className="text-xs text-muted-foreground truncate">
                        {b.subtitle}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          {hasApts && (
            <div className="px-3 py-1.5 border-t border-border">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Квартиры
              </div>
              {results.apartments.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="option"
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => {
                    navigate(`/object/${a.slug}`);
                    onSelect();
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{a.title}</div>
                    {a.block_name && (
                      <div className="text-xs text-muted-foreground truncate">
                        {a.block_name}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium shrink-0">
                    {formatPrice(a.price)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
