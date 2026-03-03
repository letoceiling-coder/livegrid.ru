import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Phone, LogIn, Heart } from 'lucide-react';

const menuItems = [
  { label: 'Новостройки', href: '/catalog-zhk' },
  { label: 'Квартиры', href: '/catalog?type=apartments' },
  { label: 'Ипотека', href: '/ipoteka' },
  { label: 'Контакты', href: '/contacts' },
];

interface BurgerMenuProps { open: boolean; onClose: () => void; }

const BurgerMenu = ({ open, onClose }: BurgerMenuProps) => {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Меню"
    >
      <div 
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div 
        className="relative w-full max-w-sm bg-background flex flex-col h-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
          <Link to="/" className="font-semibold text-base" onClick={onClose}>Live Grid</Link>
          <button 
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-secondary transition-colors cursor-pointer min-w-[44px] min-h-[44px]"
            aria-label="Закрыть меню"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item, i) => (
              <li key={i}>
                <Link 
                  to={item.href} 
                  onClick={onClose}
                  className="flex items-center min-h-[44px] py-3 px-4 rounded-lg hover:bg-secondary transition-colors text-base font-medium cursor-pointer"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 pt-6 border-t border-border space-y-2">
            <Link 
              to="/favorites" 
              onClick={onClose}
              className="flex items-center gap-3 min-h-[44px] py-3 px-4 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
            >
              <Heart className="w-5 h-5 text-muted-foreground" />
              <span className="text-base">Избранное</span>
            </Link>
            <a 
              href="tel:+74950000000" 
              className="flex items-center gap-3 min-h-[44px] py-3 px-4 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
            >
              <Phone className="w-5 h-5 text-muted-foreground" />
              <span className="text-base">+7 (495) 000-00-00</span>
            </a>
            <Link 
              to="/login" 
              onClick={onClose}
              className="flex items-center gap-3 min-h-[44px] py-3 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer font-medium"
            >
              <LogIn className="w-5 h-5" />
              <span>Войти</span>
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default BurgerMenu;
