import { useState } from 'react';
import Header from '@/components/Header';
import FooterSection from '@/components/FooterSection';
import api from '@/lib/api';

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 1) return digits ? `+7${digits}` : '';
  const d = digits.startsWith('7') ? digits.slice(1) : digits;
  let s = '+7';
  if (d.length > 0) s += ` (${d.slice(0, 3)}`;
  if (d.length > 3) s += `) ${d.slice(3, 6)}`;
  if (d.length > 6) s += `-${d.slice(6, 8)}`;
  if (d.length > 8) s += `-${d.slice(8, 10)}`;
  return s;
}

const Ipoteka = () => {
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rawPhone = phone.replace(/\D/g, '');
  const normalizedRaw = rawPhone.startsWith('8') ? '7' + rawPhone.slice(1) : rawPhone;
  const isValid = normalizedRaw.length === 11 && normalizedRaw.startsWith('7');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setPhone(formatPhone(v));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);
    try {
      const normalized = normalizedRaw.startsWith('7') ? `+${normalizedRaw}` : `+7${normalizedRaw}`;
      await api.post('/leads', { phone: normalized, source: 'ipoteka' });
      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Ошибка отправки. Попробуйте позже.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">Ипотека</h1>
          <p className="text-muted-foreground text-center mb-8">
            Укажите номер телефона, чтобы получить консультацию
          </p>
          {submitted ? (
            <div className="bg-primary/10 text-primary rounded-xl p-6 text-center text-base font-medium">
              Спасибо! Мы свяжемся с вами.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="+7 (___) ___-__-__"
                  value={phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-base outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoComplete="tel"
                />
                {error && (
                  <p className="text-destructive text-sm mt-2">{error}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={!isValid || loading}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium text-base hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity cursor-pointer"
              >
                {loading ? 'Отправка…' : 'Отправить заявку'}
              </button>
            </form>
          )}
        </div>
      </main>
      <FooterSection />
    </div>
  );
};

export default Ipoteka;
