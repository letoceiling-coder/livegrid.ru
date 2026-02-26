import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Heart, Play, MessageCircle, Phone, Building, Layers, Maximize, Ruler, DoorOpen, Paintbrush } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';
import ZhkCard, { type ZhkData } from '@/components/ZhkCard';
import PropertyCard, { type PropertyData } from '@/components/PropertyCard';
import QuizSection from '@/components/QuizSection';
import AboutPlatform from '@/components/AboutPlatform';
import AdditionalFeatures from '@/components/AdditionalFeatures';
import LatestNews from '@/components/LatestNews';
import ContactsSection from '@/components/ContactsSection';
import FooterSection from '@/components/FooterSection';
import building1 from '@/assets/building1.jpg';
import building2 from '@/assets/building2.jpg';
import building3 from '@/assets/building3.jpg';
import building4 from '@/assets/building4.jpg';

/* ---- mock data ---- */
const objectData = {
  name: '2-спальная квартира 63.2м²',
  price: '5 600 000 руб',
  pricePerM2: '88 607 руб / м²',
  rooms: '2 комнаты',
  area: '63.2 м²',
  floor: '8 / 16 этаж',
  type: 'Квартира',
  finish: 'Черновая',
  zhkName: 'ЖК Смородина',
  zhkSlug: 'smorodina',
  deliveryDate: 'Март 2027',
  images: [building1, building2, building3, building4],
  description: [
    'Просторная двухкомнатная квартира в современном жилом комплексе с продуманной планировкой и качественной отделкой. Большие окна обеспечивают максимальное естественное освещение.',
    'Квартира расположена на 8 этаже 16-этажного дома, что обеспечивает прекрасный вид на парковую зону и городскую панораму.',
    'В шаговой доступности расположены школы, детские сады, торговые центры и станция метро.',
  ],
  characteristics: [
    { label: 'Комнаты', value: '2', icon: DoorOpen },
    { label: 'Этажность', value: '16 этажей', icon: Layers },
    { label: 'Площадь', value: '63.2 м²', icon: Maximize },
    { label: 'Отделка', value: 'Черновая', icon: Paintbrush },
  ],
  developer: [
    'Компания Siam Oriental осуществляет свою деятельность в городе Паттайя, начиная с 2004 года, являясь крупнейшим финским застройщиком в Таиланде.',
    'Siam Oriental Dream — 11-й проект в районе Пратамнак. Уже более 1 400 владельцев квартир в кондоминиумах Siam Oriental воплотили свою мечту о собственной недвижимости.',
  ],
  infrastructure: [
    { title: 'Особенности', image: '', accent: true },
    { title: 'Современный фитнес-зал', image: building2 },
    { title: 'Зона отдыха и парка', image: building3 },
    { title: 'Сад и зеленая зона', image: building4 },
    { title: 'Бассейн на 16 этаже\nс панорамным видом на море', image: building1 },
  ],
};

const similarZhk: ZhkData[] = [
  { images: [building2, building1, building3], name: 'ЖК Высота', price: 'от 12.3 млн', unitsCount: '180 квартир', badges: ['Ипотека 6%'], apartments: [{ type: '2-комнатная', area: 'от 68 м.кв.', price: 'от 12.3 млн' }] },
  { images: [building3, building4, building1], name: 'ЖК Парк Сити', price: 'от 7.1 млн', unitsCount: '340 квартир', badges: [], apartments: [{ type: '1-комнатная', area: 'от 38 м.кв.', price: 'от 7.1 млн' }] },
  { images: [building1, building2, building4], name: 'ЖК Снегири', price: 'от 5.6 млн', unitsCount: '226 квартир', badges: ['Рассрочка'], apartments: [{ type: 'Студия', area: 'от 24 м.кв.', price: 'от 5.6 млн' }] },
  { images: [building4, building3, building2], name: 'ЖК Лесной', price: 'от 9.5 млн', unitsCount: '95 квартир', badges: [], apartments: [{ type: '2-комнатная', area: 'от 54 м.кв.', price: 'от 9.5 млн' }] },
];

const similarObjects: PropertyData[] = [
  { image: building1, title: 'Дом 145 м², Подмосковье', price: 'от 12.5 млн', address: 'Москва, р-н Тверской', area: '145 м²', rooms: '4 комн.', badges: ['Новый'] },
  { image: building2, title: 'Дом 130 м², Подмосковье', price: 'от 10.8 млн', address: 'МО, г. Красногорск', area: '130 м²', rooms: '3 комн.' },
  { image: building3, title: 'Дом 115 м², Подмосковье', price: 'от 9.2 млн', address: 'МО, г. Балашиха', area: '115 м²', rooms: '3 комн.' },
  { image: building4, title: 'Дом 160 м², Подмосковье', price: 'от 15.4 млн', address: 'Москва, Хамовники', area: '160 м²', rooms: '4 комн.' },
  { image: building2, title: 'Дом 95 м², Подмосковье', price: 'от 7.6 млн', address: 'МО, Одинцово', area: '95 м²', rooms: '2 комн.' },
  { image: building3, title: 'Дом 110 м², Подмосковье', price: 'от 8.9 млн', address: 'МО, Мытищи', area: '110 м²', rooms: '3 комн.' },
  { image: building1, title: 'Дом 180 м², Подмосковье', price: 'от 18.1 млн', address: 'Москва, Арбат', area: '180 м²', rooms: '5 комн.' },
  { image: building4, title: 'Дом 125 м², Подмосковье', price: 'от 10.2 млн', address: 'МО, Люберцы', area: '125 м²', rooms: '3 комн.' },
];

const ObjectDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [liked, setLiked] = useState(false);
  const [mainPhoto, setMainPhoto] = useState(0);
  const d = objectData;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Breadcrumb */}
      <section className="py-3">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            <Link to="/" className="hover:text-primary">Главная</Link>
            <ChevronRight className="w-3 h-3" />
            <span>Новостройки</span>
            <ChevronRight className="w-3 h-3" />
            <Link to="/catalog-zhk" className="hover:text-primary">Объекты в Москве</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to={`/zhk/${d.zhkSlug}`} className="hover:text-primary">{d.zhkName}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground">{d.name}</span>
          </div>
        </div>
      </section>

      {/* Gallery + Sidebar */}
      <section className="pb-6">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Gallery */}
            <div className="lg:col-span-2">
              {/* Main image */}
              <div className="relative rounded-2xl overflow-hidden mb-3" style={{ height: '380px' }}>
                <img src={d.images[mainPhoto]} alt={d.name} className="w-full h-full object-cover" />
                <div className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-background transition-colors">
                  <Play className="w-5 h-5 text-foreground fill-foreground" />
                </div>
              </div>
              {/* Thumbnails */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {d.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setMainPhoto(i)}
                    className={cn(
                      "rounded-xl overflow-hidden shrink-0 border-2 transition-colors",
                      i === mainPhoto ? "border-primary" : "border-transparent hover:border-primary/40"
                    )}
                    style={{ width: '100px', height: '70px' }}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              {/* Tabs */}
              <Tabs defaultValue="description" className="mt-6">
                <TabsList className="bg-secondary rounded-xl p-1 h-auto flex gap-1 w-full overflow-x-auto justify-start">
                  <TabsTrigger value="layout" className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">Планировка</TabsTrigger>
                  <TabsTrigger value="description" className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">Описание</TabsTrigger>
                  <TabsTrigger value="infrastructure" className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">Инфраструктура</TabsTrigger>
                </TabsList>

                <TabsContent value="layout" className="mt-4">
                  <div className="bg-secondary rounded-2xl p-8 flex items-center justify-center min-h-[300px]">
                    <div className="text-center text-muted-foreground">
                      <Maximize className="w-12 h-12 mx-auto mb-3 text-primary" />
                      <p className="font-medium">Планировка квартиры</p>
                      <p className="text-sm mt-1">63.2 м² — 2 комнаты</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="description" className="mt-4">
                  <h2 className="text-xl font-bold mb-4">О проекте</h2>
                  {d.description.map((p, i) => (
                    <p key={i} className="text-sm text-muted-foreground mb-3 leading-relaxed">{p}</p>
                  ))}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                    {d.characteristics.map((c, i) => (
                      <div key={i} className="bg-secondary rounded-2xl p-4 text-center">
                        <c.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">{c.label}</p>
                        <p className="font-bold text-sm">{c.value}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="infrastructure" className="mt-4">
                  <h2 className="text-xl font-bold mb-2">Инфраструктура ЖК</h2>
                  <p className="text-sm text-muted-foreground mb-5">
                    Современная инфраструктура для комфортной жизни и отдыха.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-primary rounded-2xl p-6 flex flex-col justify-between min-h-[200px] sm:row-span-2">
                      <span className="px-3 py-1 bg-primary-foreground/20 text-primary-foreground rounded-full text-xs font-medium self-start">Особенности</span>
                      <p className="text-primary-foreground text-sm leading-relaxed mt-4">
                        Проект получил свое название, благодаря своей внутренней инфраструктуре, террасе с бассейном на крыше, фитнесу, сауне.
                      </p>
                    </div>
                    {d.infrastructure.filter(inf => !inf.accent).map((inf, i) => (
                      <div key={i} className="rounded-2xl overflow-hidden relative group cursor-pointer">
                        <img src={inf.image} alt={inf.title} className="w-full h-full object-cover min-h-[160px] group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                        <p className="absolute bottom-3 left-3 right-3 text-background text-sm font-medium whitespace-pre-line">{inf.title}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right sticky sidebar */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-20">
                <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                  {/* Price */}
                  <div>
                    <p className="text-xs text-muted-foreground">Стоимость квартиры 63.2 м²</p>
                    <p className="text-2xl font-bold mt-1">{d.price}</p>
                    <p className="text-sm text-muted-foreground">{d.pricePerM2}</p>
                  </div>

                  <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium">
                    Получить ипотеку
                  </button>

                  {/* Characteristics */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground font-medium">Характеристики</p>
                    {[
                      ['Комнат', d.rooms],
                      ['Площадь', d.area],
                      ['Этаж', d.floor],
                      ['Тип', d.type],
                    ].map(([label, value], i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Contact */}
                  <div className="pt-2 border-t border-border space-y-3">
                    <div className="flex gap-2 justify-center">
                      {['TG', 'VK', 'WA'].map(s => (
                        <a key={s} href="#" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-colors">
                          {s}
                        </a>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <input type="text" placeholder="Ваше имя" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      <input type="tel" placeholder="+7 (___) ___-__-__" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium">
                        Отправить заявку
                      </button>
                    </div>
                  </div>

                  {/* Favorite */}
                  <button
                    onClick={() => setLiked(!liked)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-border text-sm hover:bg-secondary transition-colors"
                  >
                    <Heart className={cn("w-4 h-4", liked ? "fill-primary text-primary" : "text-muted-foreground")} />
                    Добавить в избранное
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <h2 className="text-xl md:text-2xl font-bold mb-2">Объект на карте</h2>
          <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5">
            <span className="text-primary">📍</span> Местоположение
          </p>
          <div className="bg-secondary rounded-2xl overflow-hidden relative" style={{ height: '400px' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-primary-foreground text-lg">📍</span>
                </div>
                <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium">{d.zhkName}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Developer */}
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <h2 className="text-xl md:text-2xl font-bold mb-4">О застройщике</h2>
          {d.developer.map((p, i) => (
            <p key={i} className="text-sm text-muted-foreground mb-3 leading-relaxed max-w-3xl">{p}</p>
          ))}
        </div>
      </section>

      {/* Similar ZHK */}
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold">Похожие ЖК</h2>
            <Link to="/catalog-zhk" className="text-primary text-sm font-medium hover:underline">Все предложения →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {similarZhk.map((zhk, i) => (
              <ZhkCard key={i} data={zhk} />
            ))}
          </div>
        </div>
      </section>

      {/* Similar Objects */}
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold">Похожие объекты</h2>
            <Link to="/catalog" className="text-primary text-sm font-medium hover:underline">Все предложения →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {similarObjects.map((obj, i) => (
              <PropertyCard key={i} data={obj} />
            ))}
          </div>
        </div>
      </section>

      {/* Quiz */}
      <QuizSection />

      {/* About Platform */}
      <AboutPlatform />

      {/* Additional Features */}
      <AdditionalFeatures />

      {/* Contacts */}
      <ContactsSection />

      {/* Footer */}
      <FooterSection />
    </div>
  );
};

export default ObjectDetail;
