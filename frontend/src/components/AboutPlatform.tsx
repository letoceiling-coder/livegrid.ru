import { Link } from 'react-router-dom';
import { Building, Users, MapPin, Award } from 'lucide-react';
import { usePlatformStats } from '@/hooks/usePlatformStats';
import { Skeleton } from '@/components/ui/skeleton';
import building1 from '@/assets/building1.jpg';
import building2 from '@/assets/building2.jpg';
import building3 from '@/assets/building3.jpg';

const displayStats = [
  { key: 'years_on_market', label: 'лет на рынке', icon: Award, suffix: '+' },
  { key: 'total_users', label: 'сотрудников', icon: Users, suffix: '+' },
  { key: 'total_objects', label: 'клиентов', icon: Building, suffix: '+' },
  { key: 'total_regions', label: 'регионов', icon: MapPin, suffix: '' },
];

const AboutPlatform = () => {
  const { stats: platformStats, loading } = usePlatformStats();

  const formatStat = (key: string, val: number | undefined) => {
    if (loading || val == null) return '—';
    if (key === 'total_objects' && val >= 1000) return `${Math.floor(val / 1000)} тыс`;
    return val.toLocaleString('ru-RU');
  };

  return (
    <section className="py-16 md:py-20">
      <div className="max-w-[1400px] mx-auto px-4">
        {/* 1. Заголовок блока */}
        <h2 className="text-[32px] md:text-[36px] font-bold mb-8 md:mb-10">
          О платформе Live Grid
        </h2>
        <div className="w-[70px] h-0.5 bg-primary mt-3" aria-hidden />

        {/* 2. Основная сетка */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mt-10 md:mt-12">
          {/* 3. Левая часть — изображения */}
          <div className="order-1 md:order-1">
            {/* A) Большая карточка */}
            <div className="relative rounded-2xl overflow-hidden h-[400px] min-h-[380px] max-h-[420px] bg-muted">
              <img
                src={building1}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-left">
                <h3 className="text-white font-semibold text-lg">Эксклюзивные объекты</h3>
                <p className="text-white/90 text-sm max-w-[80%] mt-1">
                  Мы работаем с самыми редкими объектами недвижимости для клиентов с высокими бюджетами
                </p>
              </div>
            </div>

            {/* B) Две нижние карточки */}
            <div className="grid grid-cols-2 gap-4 md:gap-6 mt-4 md:mt-6">
              <div className="relative rounded-2xl overflow-hidden h-[200px] bg-muted group hover:opacity-95 transition-opacity">
                <img src={building2} alt="" className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-200" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                  <h4 className="text-white font-semibold text-base">Низкий %</h4>
                  <p className="text-white/90 text-xs mt-0.5">Сделаем выгодный платёж по ипотеке под Ваш запрос</p>
                </div>
              </div>
              <div className="relative rounded-2xl overflow-hidden h-[200px] bg-muted group hover:opacity-95 transition-opacity">
                <img src={building3} alt="" className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-200" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                  <h4 className="text-white font-semibold text-base">Большой опыт</h4>
                  <p className="text-white/90 text-xs mt-0.5">Позволяет нам найти самые выгодные предложения</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Правая часть — текст + кнопки + цифры */}
          <div className="order-2 md:order-2 space-y-0">
            {/* A) Заголовок */}
            <h3 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">
              Платформа по недвижимости
            </h3>

            {/* B) Текст описания */}
            <div className="text-base leading-relaxed max-w-[600px] space-y-4">
              <p>
                LiveGrid — современная платформа по недвижимости, созданная на базе агентства «Авангард».
              </p>
              <p>
                Мы сопровождаем сделки по всей России, работая с жилой и коммерческой недвижимостью любого уровня — от новостроек до инвестиционных объектов. Команда базируется в Белгороде и обеспечивает полный цикл сопровождения: подбор, переговоры, юридическая защита и закрытие сделки.
              </p>
              <p>
                LiveGrid — это экспертиза, прозрачность и уверенность в результате.
              </p>
            </div>

            {/* C) Кнопки */}
            <div className="flex flex-wrap gap-4 mt-6">
              <Link
                to="/register"
                className="inline-flex items-center justify-center bg-primary text-primary-foreground rounded-xl px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Зарегистрироваться
              </Link>
              <button
                type="button"
                className="inline-flex items-center justify-center bg-secondary rounded-xl px-6 py-3 text-sm font-medium border border-border hover:bg-muted transition-colors"
              >
                Помощь с подбором
              </button>
            </div>

            {/* 5. Блок с цифрами */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-8 md:mt-10">
              {displayStats.map((s, i) => {
                const rawVal = platformStats?.[s.key as keyof typeof platformStats] as number | undefined;
                const numPart = formatStat(s.key, rawVal);
                const display = loading ? '—' : `${numPart}${s.suffix}`;
                return (
                  <div
                    key={i}
                    className="bg-muted rounded-xl p-5 text-center hover:shadow-md hover:opacity-95 transition-[box-shadow,opacity] min-h-[100px]"
                  >
                    <s.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                    {loading ? (
                      <Skeleton className="h-6 w-12 mx-auto mb-1" />
                    ) : (
                      <div className="text-xl font-bold">{display}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutPlatform;
