import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Eye, MapPin, Calendar } from 'lucide-react';
import Header from '@/components/Header';
import FooterSection from '@/components/FooterSection';
import LatestNews from '@/components/LatestNews';
import AboutPlatform from '@/components/AboutPlatform';
import AdditionalFeatures from '@/components/AdditionalFeatures';
import ContactsSection from '@/components/ContactsSection';
import ZhkCard, { ZhkData } from '@/components/ZhkCard';
import building1 from '@/assets/building1.jpg';
import building2 from '@/assets/building2.jpg';
import building3 from '@/assets/building3.jpg';
import building4 from '@/assets/building4.jpg';

const similarZhk: ZhkData[] = [
  { images: [building1, building2], name: 'ЖК Смородина', price: 'от 3.4 млн', unitsCount: '365 квартир', badges: ['Рассрочка'], apartments: [{ type: 'Студии', area: 'от 22 м²', price: 'от 3.4 млн' }, { type: '1-комн', area: 'от 35 м²', price: 'от 5.1 млн' }] },
  { images: [building2, building3], name: 'ЖК Панорама', price: 'от 4.8 млн', unitsCount: '280 квартир', badges: ['Сдан'], apartments: [{ type: 'Студии', area: 'от 25 м²', price: 'от 4.8 млн' }] },
  { images: [building3, building4], name: 'ЖК Аквамарин', price: 'от 5.2 млн', unitsCount: '190 квартир', badges: ['Ипотека 3%'], apartments: [{ type: '1-комн', area: 'от 38 м²', price: 'от 5.2 млн' }] },
  { images: [building4, building1], name: 'ЖК Riverside', price: 'от 6.1 млн', unitsCount: '420 квартир', badges: ['Старт продаж'], apartments: [{ type: '2-комн', area: 'от 55 м²', price: 'от 6.1 млн' }] },
];

const NewsDetail = () => {
  const { slug } = useParams();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Breadcrumb */}
      <div className="max-w-[1400px] mx-auto px-4 pt-4 pb-2">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
          <Link to="/" className="hover:text-foreground transition-colors">Главная</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/news" className="hover:text-foreground transition-colors">Новости</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">Старт строительства нового комплекса</span>
        </nav>
      </div>

      {/* Hero: Image + Title */}
      <section className="max-w-[1400px] mx-auto px-4 pb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main image */}
          <div className="lg:w-1/2 relative rounded-2xl overflow-hidden aspect-[4/3]">
            <img src={building1} alt="Новость" className="w-full h-full object-cover" />
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium">НОВЫЕ СЕЗОНЫ 2</span>
              <span className="px-2.5 py-1 bg-destructive text-destructive-foreground rounded-full text-xs font-medium">СТАРТ ПРОДАЖ</span>
            </div>
            <span className="absolute bottom-3 right-3 px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-bold">РЕМОНТ В ПОДАРОК</span>
          </div>

          {/* Title & text */}
          <div className="lg:w-1/2 flex flex-col justify-center">
            <h1 className="text-2xl lg:text-3xl font-bold mb-3">Старт строительства нового комплекса в центре Москвы</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> 15 фев 2025</span>
              <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> 1 250</span>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>Старт строительства нового жилого комплекса бизнес-класса в центре Москвы. Комплекс включает 4 корпуса с квартирами от студий до пентхаусов с панорамным остеклением.</p>
              <p>Территория комплекса предусматривает благоустроенный двор, подземный паркинг, детские площадки и зоны отдыха для жителей. Срок сдачи первого корпуса — март 2027 года.</p>
              <p>Специальные условия при покупке в первый месяц продаж: скидка 5% на все типы квартир и ремонт в подарок при 100% оплате.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture section */}
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold mb-3">Архитектура проекта</h2>
              <div className="rounded-2xl overflow-hidden aspect-[4/3]">
                <img src={building2} alt="Архитектура" className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold mb-3">Планировки квартир</h2>
              <div className="rounded-2xl overflow-hidden aspect-[4/3]">
                <img src={building3} alt="Планировки" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed mb-6">
            <p>Архитектурная концепция комплекса разработана ведущим московским бюро. Фасады выполнены в современном стиле с использованием натуральных материалов — камня, дерева и стекла.</p>
            <p>Все квартиры имеют свободные планировки с высотой потолков 3.1 метра. Панорамное остекление от пола до потолка обеспечивает максимальное количество естественного света.</p>
          </div>

          {/* Video block */}
          <div className="bg-primary rounded-2xl flex items-center justify-center min-h-[200px] md:min-h-[300px]">
            <span className="text-3xl font-bold text-primary-foreground">ВИДЕО</span>
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <h2 className="text-2xl font-bold mb-2">Инфраструктура ЖК</h2>
          <p className="text-sm text-muted-foreground mb-6">Всё необходимое для комфортной жизни на территории комплекса</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-primary rounded-2xl p-6 text-primary-foreground flex flex-col justify-between col-span-2 lg:col-span-1 min-h-[180px]">
              <h3 className="font-bold text-lg">Особенности</h3>
              <p className="text-sm opacity-80 mt-2">Закрытая территория, подземный паркинг, видеонаблюдение 24/7</p>
            </div>
            {[
              { img: building1, label: 'Фитнес-зал' },
              { img: building2, label: 'Зона отдыха' },
              { img: building3, label: 'Сад и бассейн' },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl overflow-hidden relative min-h-[180px]">
                <img src={item.img} alt={item.label} className="w-full h-full object-cover absolute inset-0" />
                <div className="absolute inset-0 bg-foreground/30" />
                <span className="absolute bottom-3 left-3 text-background font-semibold text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <h2 className="text-2xl font-bold mb-1">Объект на карте</h2>
          <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1"><MapPin className="w-4 h-4" /> Москва, ЦАО</p>
          <div className="rounded-2xl overflow-hidden bg-accent min-h-[300px] md:min-h-[400px] flex items-center justify-center relative">
            <div className="text-muted-foreground text-sm">Карта</div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
        </div>
      </section>

      {/* Developer */}
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4">О застройщике</h2>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            <p>Компания «СтройИнвест» — один из ведущих застройщиков Москвы с опытом работы более 15 лет. За время существования компания реализовала свыше 30 жилых комплексов общей площадью более 2 млн квадратных метров.</p>
            <p>Все проекты компании отличаются высоким качеством строительства, продуманными планировками и современной инфраструктурой. Компания входит в ТОП-10 застройщиков России по объёму текущего строительства.</p>
          </div>
        </div>
      </section>

      {/* Similar ZHK */}
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">Похожие ЖК</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {similarZhk.map((z, i) => <ZhkCard key={i} data={z} />)}
          </div>
        </div>
      </section>

      <LatestNews />
      <AboutPlatform />
      <AdditionalFeatures />
      <ContactsSection />
      <FooterSection />
    </div>
  );
};

export default NewsDetail;
