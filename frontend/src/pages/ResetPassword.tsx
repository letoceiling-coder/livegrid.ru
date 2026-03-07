import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import Header from '@/components/Header';
import FooterSection from '@/components/FooterSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resetPassword } from '@/lib/auth';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await resetPassword({
        token,
        email,
        password,
        password_confirmation: confirmPassword,
      });
      setDone(true);
    } catch (err: any) {
      const message =
        err?.response?.data?.errors?.password?.[0] ??
        err?.response?.data?.errors?.email?.[0] ??
        err?.response?.data?.message ??
        'Не удалось изменить пароль';
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
          {!done ? (
            <>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Новый пароль</h1>
                <p className="text-sm text-muted-foreground">Придумайте новый пароль для вашего аккаунта</p>
              </div>
              {!token || !email ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  Невалидная ссылка восстановления. Запросите новую ссылку.
                </div>
              ) : null}
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Новый пароль</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Минимум 8 символов"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Подтвердите пароль</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Повторите пароль"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={loading || !token || !email}>
                  {loading ? 'Сохраняем...' : 'Сохранить пароль'}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Пароль изменён</h1>
              <p className="text-sm text-muted-foreground">Теперь вы можете войти с новым паролем</p>
              <Link to="/login">
                <Button className="rounded-full">Войти</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      <FooterSection />
    </div>
  );
};

export default ResetPassword;
