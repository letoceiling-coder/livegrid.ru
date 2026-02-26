import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, UserSearch, Building2, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const features = [
  {
    icon: Calculator,
    title: 'Ипотечный калькулятор',
    button: 'Рассчитаем ипотеку',
    action: 'calc',
    gradient: 'from-blue-100 to-sky-50',
    iconColor: 'text-blue-500',
  },
  {
    icon: UserSearch,
    title: 'Индивидуальный подбор',
    button: 'Помощь с подбором',
    action: 'modal',
    gradient: 'from-emerald-100 to-green-50',
    iconColor: 'text-emerald-500',
  },
  {
    icon: Building2,
    title: 'Вся недвижимость',
    button: 'Все предложения',
    action: 'catalog',
    gradient: 'from-orange-100 to-amber-50',
    iconColor: 'text-orange-500',
  },
  {
    icon: UserCircle,
    title: 'Ваш личный кабинет',
    button: 'Войти / Зарегистрироваться',
    action: 'auth',
    gradient: 'from-violet-100 to-purple-50',
    iconColor: 'text-violet-500',
  },
];

const AdditionalFeatures = () => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', comment: '' });

  const handleAction = (action: string) => {
    switch (action) {
      case 'calc':
        navigate('/catalog');
        break;
      case 'modal':
        setModalOpen(true);
        break;
      case 'catalog':
        navigate('/catalog');
        break;
      case 'auth':
        navigate('/login');
        break;
    }
  };

  return (
    <section className="py-12">
      <div className="max-w-[1400px] mx-auto px-4">
        <h2 className="text-2xl font-bold mb-8">Дополнительные возможности</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div key={i} className="flex flex-col gap-3">
              {/* Card */}
              <div
                onClick={() => handleAction(f.action)}
                className={`
                  bg-gradient-to-br ${f.gradient}
                  rounded-2xl p-8 flex flex-col items-center justify-center
                  cursor-pointer select-none
                  h-[220px]
                  shadow-sm
                  transition-all duration-250 ease-out
                  hover:-translate-y-1.5 hover:shadow-lg
                  will-change-transform
                `}
              >
                <f.icon className={`w-16 h-16 ${f.iconColor} mb-4`} strokeWidth={1.5} />
                <span className="text-base font-semibold text-foreground text-center leading-tight">
                  {f.title}
                </span>
              </div>

              {/* Button */}
              <Button
                onClick={() => handleAction(f.action)}
                className="w-full rounded-xl h-12 text-sm font-medium"
              >
                {f.button}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Помощь с подбором</DialogTitle>
            <DialogDescription>Оставьте заявку и мы подберём лучшие варианты</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4 mt-2"
            onSubmit={(e) => {
              e.preventDefault();
              setModalOpen(false);
              setFormData({ name: '', phone: '', comment: '' });
            }}
          >
            <input
              type="text"
              placeholder="Ваше имя"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="tel"
              placeholder="Телефон"
              value={formData.phone}
              onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
            />
            <textarea
              placeholder="Комментарий"
              value={formData.comment}
              onChange={(e) => setFormData((p) => ({ ...p, comment: e.target.value }))}
              rows={3}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <Button type="submit" className="w-full rounded-xl h-12">
              Отправить заявку
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default AdditionalFeatures;
