import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import FooterSection from '@/components/FooterSection';
import { Phone } from 'lucide-react';

const ContactsPage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto px-4 pt-12 pb-16">
          <nav className="text-sm text-muted-foreground mb-8">
            <Link to="/" className="hover:text-foreground transition-colors">Главная</Link>
            <span className="mx-2">/</span>
            <span>Контакты</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-bold mb-8">
            Свяжитесь с <span className="text-primary">LiveGrid</span>
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            <div className="lg:col-span-4 bg-card rounded-2xl p-8 shadow-sm border border-border">
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Звоните, проконсультируем</p>
                  <a href="tel:+79163330808" className="text-base font-bold hover:text-primary transition-colors">
                    +7 916 333 08 08
                  </a>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Отдел продаж</p>
                  <a href="tel:+79163330909" className="text-base font-bold hover:text-primary transition-colors">
                    +7 916 333 09 09
                  </a>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Электронная почта</p>
                  <a href="mailto:info@livegrid.ru" className="text-base font-bold hover:text-primary transition-colors">
                    info@livegrid.ru
                  </a>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Режим работы</p>
                  <p className="text-base font-bold">Пн–Сб с 10:00 до 18:00</p>
                </div>

                {/* Соцсети пока закомментированы
                <div className="flex gap-4 pt-2">
                  <a href="tel:+79163330808" ...><Phone /></a>
                  <a href="https://t.me/livegrid" ...><Send /></a>
                  <a href="https://vk.com/livegrid" ...>VK</a>
                  <a href="https://youtube.com" ...><Youtube /></a>
                </div>
                */}
                <div className="flex gap-4 pt-2">
                  <a
                    href="tel:+79163330808"
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
                    aria-label="Позвонить"
                  >
                    <Phone className="w-5 h-5 text-muted-foreground" />
                  </a>
                  {/* <a href="https://t.me/livegrid" ...><Send /></a>
                  <a href="https://vk.com/livegrid" ...>VK</a>
                  <a href="https://youtube.com" ...><Youtube /></a> */}
                </div>

                <Link
                  to="/login"
                  className="flex items-center justify-center w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors mt-6"
                >
                  Войти / Зарегистрироваться
                </Link>
              </div>
            </div>

            <div className="lg:col-span-8 rounded-2xl overflow-hidden shrink-0 h-[320px] lg:h-[500px] bg-muted">
              <img
                src="/contacts.png"
                alt="Современный город и жилой комплекс"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
};

export default ContactsPage;
