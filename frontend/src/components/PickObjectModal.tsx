import { useState } from 'react';
import { X } from 'lucide-react';
import api from '@/lib/api';

function formatPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 1) return d ? `+7${d}` : '';
  const n = d.startsWith('7') ? d.slice(1) : d;
  let s = '+7';
  if (n.length > 0) s += ` (${n.slice(0, 3)}`;
  if (n.length > 3) s += `) ${n.slice(3, 6)}`;
  if (n.length > 6) s += `-${n.slice(6, 8)}`;
  if (n.length > 8) s += `-${n.slice(8, 10)}`;
  return s;
}

export default function PickObjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const raw = phone.replace(/\D/g, '');
  const norm = raw.startsWith('8') ? '7' + raw.slice(1) : raw;
  const valid = norm.length === 11 && norm.startsWith('7');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    try {
      await api.post('/leads', { phone: `+${norm}`, source: 'pick_object' });
      setSubmitted(true);
      setTimeout(() => { onClose(); setPhone(''); setSubmitted(false); }, 2000);
    } catch { setLoading(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-background rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Подобрать объект</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary cursor-pointer" aria-label="Закрыть"><X className="w-5 h-5" /></button>
        </div>
        {submitted ? <p className="text-primary font-medium py-4">Спасибо! Мы свяжемся с вами.</p> : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-muted-foreground">Укажите номер телефона</p>
            <input type="tel" inputMode="tel" placeholder="+7 (___) ___-__-__" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} className="w-full px-4 py-3 rounded-lg border border-border bg-background text-base outline-none focus:ring-2 focus:ring-primary" />
            <button type="submit" disabled={!valid || loading} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 cursor-pointer">{loading ? 'Отправка…' : 'Отправить заявку'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
