import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Menu, LogIn, Heart } from 'lucide-react';
import BurgerMenu from './BurgerMenu';

const navItems = [
  { label: 'Новостройки', href: '/catalog-zhk' },
  { label: 'Квартиры', href: '/catalog?type=apartments' },
  { label: 'Ипотека', href: '/ipoteka' },
];

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 cursor-pointer shrink-0" aria-label="На главную">
            <img src="/logo.svg" alt="Live Grid" className="w-9 h-9 rounded-lg" />
            <span className="font-semibold text-base hidden sm:inline">Live Grid</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item, i) => (
              <Link key={i} to={item.href} className="px-3 py-2 text-sm hover:text-primary transition-colors rounded-md min-h-[44px] flex items-center">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden lg:flex items-center gap-4 text-sm">
            <Link to="/favorites" className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-secondary transition-colors cursor-pointer" title="Избранное">
              <Heart className="w-5 h-5 text-muted-foreground" />
            </Link>
            <a href="tel:+74950000000" className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer min-h-[44px] items-center">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>+7 (495) 000-00-00</span>
            </a>
            <Link to="/login" className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-opacity flex items-center gap-1.5 shrink-0 cursor-pointer">
              <LogIn className="w-4 h-4" />
              Войти
            </Link>
          </div>
          <button className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors min-h-[44px] min-w-[44px]" onClick={() => setMenuOpen(true)} aria-label="Меню">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>
      <BurgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
};

export default Header;
