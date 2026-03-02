import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';

const ContactsSection = React.forwardRef<HTMLElement>((_, ref) => (
  <section ref={ref} className="py-12">
    <div className="max-w-[1400px] mx-auto px-4">
      <h2 className="text-2xl font-bold mb-8">Свяжитесь с <span className="text-primary">LiveGrid</span></h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="font-medium">+7 (4) 333 44 11</p>
              <p className="text-sm text-muted-foreground">+7 (4) 333 66 12</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm">info@livegrid.ru</p>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm">Москва, ул. Примерная, д. 1</p>
          </div>
          <div className="flex gap-3 pt-4">
            {['VK', 'TG', 'YT', 'OK'].map((s, i) => (
              <a key={i} href="#" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-colors">
                {s}
              </a>
            ))}
          </div>
        </div>
        <div className="bg-accent rounded-2xl flex items-center justify-center min-h-[300px]">
          <span className="text-3xl font-bold text-primary">VIDEO</span>
        </div>
      </div>
    </div>
  </section>
));

ContactsSection.displayName = 'ContactsSection';

export default ContactsSection;
