import React from 'react';
import { Link } from 'react-router-dom';

const footerColumns = [
  { title: 'Покупка', items: ['Новостройки', 'Вторичка', 'Коттеджи', 'Участки', 'Коммерция'] },
  { title: 'Аренда', items: ['Квартиры', 'Дома', 'Офисы', 'Склады', 'Помещения'] },
  { title: 'Ипотека', items: ['Калькулятор', 'Банки-партнеры', 'Программы', 'Рефинансирование'] },
  { title: 'Компания', items: ['О нас', 'Контакты', 'Карьера', 'Блог', 'Партнерам'] },
];

const FooterSection = React.forwardRef<HTMLElement>((_, ref) => (
  <footer ref={ref} className="bg-foreground text-background py-12">
    <div className="max-w-[1400px] mx-auto px-4">
      <Link to="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xs">LG</span>
        </div>
        <span className="font-bold">Live Grid</span>
      </Link>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
        {footerColumns.map((col, i) => (
          <div key={i}>
            <h3 className="font-bold text-sm mb-4">{col.title}</h3>
            <ul className="space-y-2">
              {col.items.map((item, j) => (
                <li key={j}><a href="#" className="text-sm opacity-70 hover:opacity-100 transition-opacity">{item}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-background/20 pt-6 text-sm opacity-60">
        <p>© 2025 Live Grid. Все права защищены.</p>
      </div>
    </div>
  </footer>
));

FooterSection.displayName = 'FooterSection';

export default FooterSection;
