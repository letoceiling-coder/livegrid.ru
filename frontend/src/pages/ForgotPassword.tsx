import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import FooterSection from '@/components/FooterSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { forgotPassword } from '@/lib/auth';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await forgotPassword({ email });
      setSent(true);
    } catch (err: any) {
      const message =
        err?.response?.data?.errors?.email?.[0] ??
        err?.response?.data?.message ??
        'Не удалось отправить ссылку восстановления';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-6">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Назад ко входу
          </Link>

          {!sent ? (
            <>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Забыли пароль?</h1>
                <p className="text-sm text-muted-foreground">Введите email и мы отправим ссылку для восстановления</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" placeholder="mail@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={loading}>
                  {loading ? 'Отправляем...' : 'Отправить ссылку'}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Проверьте почту</h1>
              <p className="text-sm text-muted-foreground">
                Мы отправили ссылку для восстановления на <span className="font-medium text-foreground">{email}</span>
              </p>
              <Button variant="outline" className="rounded-full" onClick={() => setSent(false)}>
                Отправить повторно
              </Button>
            </div>
          )}
        </div>
      </div>
      <FooterSection />
    </div>
  );
};

export default ForgotPassword;
