import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Phone, Menu, X, Search, MapPin, Building2, Home, LayoutGrid, Map as MapIcon, Heart, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useSearch } from '@/hooks/useSearch';

const navItems = [
  { label: 'Каталог', href: '/catalog' },
  { label: 'Квартиры', href: '/apartments' },
  { label: 'На карте', href: '/map' },
  { label: 'Застройщики', href: '/catalog?tab=builders' },
];

const RedesignHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  const { results: searchResults, loading: searchLoading } = useSearch(query);
  const suggestionComplexes = (searchResults?.residential_complexes ?? []).slice(0, 5);
  const suggestionApartments = (searchResults?.apartments ?? []).slice(0, 5);
  const hasSuggestions = suggestionComplexes.length > 0 || suggestionApartments.length > 0;
  const showSuggestions = searchOpen && query.trim().length >= 2;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const dropdown = document.getElementById('header-search-dropdown');
      const inside = searchRef.current?.contains(e.target as Node) || dropdown?.contains(e.target as Node);
      if (!inside) setSearchOpen(false);
    };
    const onScroll = () => setSearchOpen(false);
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 flex items-center justify-center shadow-sm">
              <img src="/logo.svg" alt="Live Grid" className="w-full h-full object-contain" />
            </div>
            <span className="hidden sm:block font-semibold text-sm tracking-tight">Live Grid</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'px-3.5 py-2 text-sm rounded-lg transition-colors',
                  location.pathname === item.href
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop search — dropdown via Portal (fixed) чтобы не скроллился со страницей */}
          <div ref={searchRef} className="hidden lg:block relative flex-1 max-w-sm">
            <div ref={inputContainerRef} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ЖК, район, метро..."
                className="pl-9 h-10 bg-muted/50 border-transparent focus:border-border focus:bg-background text-sm"
                value={query}
                onFocus={() => setSearchOpen(true)}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && query.trim()) { navigate(`/catalog?q=${encodeURIComponent(query.trim())}`); setSearchOpen(false); } }}
              />
            </div>
            {showSuggestions && inputContainerRef.current && createPortal(
              <div
                id="header-search-dropdown"
                className="fixed bg-card border border-border rounded-xl shadow-xl overflow-hidden"
                style={{
                  zIndex: 99999,
                  top: inputContainerRef.current.getBoundingClientRect().bottom + 4,
                  left: inputContainerRef.current.getBoundingClientRect().left,
                  width: inputContainerRef.current.getBoundingClientRect().width,
                  maxHeight: 320,
                }}
              >
                {searchLoading ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">Поиск...</div>
                ) : hasSuggestions ? (
                  <div className="py-2 max-h-[280px] overflow-y-auto">
                    {suggestionComplexes.length > 0 && (
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Жилые комплексы</div>
                    )}
                    {suggestionComplexes.map(c => (
                      <Link
                        key={c.id}
                        to={`/complex/${c.slug}`}
                        onClick={() => { setSearchOpen(false); setQuery(''); }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{[c.district, c.metro].filter(Boolean).join(' · ') || '—'}</p>
                        </div>
                      </Link>
                    ))}
                    {suggestionApartments.length > 0 && (
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground mt-1">Квартиры</div>
                    )}
                    {suggestionApartments.map(a => (
                      <Link
                        key={a.id}
                        to={`/apartment/${a.id}`}
                        onClick={() => { setSearchOpen(false); setQuery(''); }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{a.title}</p>
                          <p className="text-xs text-muted-foreground">{a.price != null ? `${(a.price / 1_000_000).toFixed(2)} млн ₽` : ''}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-muted-foreground">Ничего не найдено</div>
                )}
              </div>,
              document.body
            )}
          </div>

          {/* Desktop right */}
          <div className="hidden lg:flex items-center gap-4 text-sm shrink-0">
            <Link
              to="/favorites"
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-secondary transition-colors cursor-pointer"
              title="Избранное"
            >
              <Heart className="w-5 h-5 text-muted-foreground" />
            </Link>
            <a
              href="tel:+79045393434"
              className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer min-h-[44px]"
            >
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>+7 (904) 539-34-34</span>
            </a>
            <Link
              to="/login"
              className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-opacity flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Войти
            </Link>
          </div>

          {/* Mobile buttons */}
          <div className="flex lg:hidden items-center gap-2">
            <button onClick={() => setSearchOpen(!searchOpen)} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button onClick={() => setMenuOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        {searchOpen && (
          <div className="lg:hidden border-t border-border px-4 py-3 bg-background">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ЖК, район, метро..."
                className="pl-9 h-10"
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && query.trim()) { navigate(`/catalog?q=${encodeURIComponent(query.trim())}`); setSearchOpen(false); } }}
              />
            </div>
            {showSuggestions && (
              <div className="mt-2 bg-card border border-border rounded-xl overflow-hidden max-h-[280px] overflow-y-auto">
                {searchLoading ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">Поиск...</div>
                ) : hasSuggestions ? (
                  <div className="py-2">
                    {suggestionComplexes.length > 0 && (
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Жилые комплексы</div>
                    )}
                    {suggestionComplexes.map(c => (
                      <Link
                        key={c.id}
                        to={`/complex/${c.slug}`}
                        onClick={() => { setSearchOpen(false); setQuery(''); }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{[c.district, c.metro].filter(Boolean).join(' · ') || '—'}</p>
                        </div>
                      </Link>
                    ))}
                    {suggestionApartments.length > 0 && (
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground mt-1">Квартиры</div>
                    )}
                    {suggestionApartments.map(a => (
                      <Link
                        key={a.id}
                        to={`/apartment/${a.id}`}
                        onClick={() => { setSearchOpen(false); setQuery(''); }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{a.title}</p>
                          <p className="text-xs text-muted-foreground">{a.price != null ? `${(a.price / 1_000_000).toFixed(2)} млн ₽` : ''}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-muted-foreground">Ничего не найдено</div>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] bg-background flex flex-col animate-in slide-in-from-right">
          <div className="flex items-center justify-between h-16 px-4 border-b border-border">
            <span className="font-semibold">Меню</span>
            <button onClick={() => setMenuOpen(false)} className="w-10 h-10 flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
          <nav className="flex flex-col p-4 gap-1">
            {navItems.map(item => (
              <Link key={item.href} to={item.href} onClick={() => setMenuOpen(false)}
                className="py-3 px-4 rounded-xl text-sm font-medium hover:bg-accent transition-colors">{item.label}</Link>
            ))}
          </nav>
          <div className="mt-auto p-4 border-t border-border">
            <a href="tel:+79045393434" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4" /> +7 (904) 539-34-34
            </a>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-14">
          <Link to="/" className={cn('flex flex-col items-center gap-0.5 text-[10px] py-1', location.pathname === '/' ? 'text-primary' : 'text-muted-foreground')}>
            <Home className="w-5 h-5" />
            <span>Главная</span>
          </Link>
          <Link to="/catalog" className={cn('flex flex-col items-center gap-0.5 text-[10px] py-1', location.pathname === '/catalog' ? 'text-primary' : 'text-muted-foreground')}>
            <LayoutGrid className="w-5 h-5" />
            <span>Каталог</span>
          </Link>
          <Link to="/apartment" className={cn('flex flex-col items-center gap-0.5 text-[10px] py-1', location.pathname === '/apartment' ? 'text-primary' : 'text-muted-foreground')}>
            <Building2 className="w-5 h-5" />
            <span>Квартиры</span>
          </Link>
          <Link to="/map" className={cn('flex flex-col items-center gap-0.5 text-[10px] py-1', location.pathname === '/map' ? 'text-primary' : 'text-muted-foreground')}>
            <MapIcon className="w-5 h-5" />
            <span>Карта</span>
          </Link>
          <Link to="/catalog?tab=builders" className={cn('flex flex-col items-center gap-0.5 text-[10px] py-1', 'text-muted-foreground')}>
            <Building2 className="w-5 h-5" />
            <span>Застройщики</span>
          </Link>
        </div>
      </div>
    </>
  );
};

export default RedesignHeader;
