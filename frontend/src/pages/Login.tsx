import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Wallet, Eye, EyeOff } from 'lucide-react';
import { useI18n } from '@/i18n';

export default function Login() {
  const { t } = useI18n();
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(form.email, form.password, form.name);
      } else {
        await login(form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || t('Có lỗi xảy ra'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8 animate-fade-in-up">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg transition-transform duration-300 hover:scale-105">
            <Wallet className="w-8 h-8 sm:w-9 sm:h-9 text-primary-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{t('FinanceManager')}</h1>
          <p className="text-primary-200 mt-1 text-sm sm:text-base">{t('Quản lý tài chính cá nhân thông minh')}</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-5 sm:mb-6 text-center sm:text-left">
            {isRegister ? t('Tạo tài khoản mới') : t('Đăng nhập')}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Họ và tên')}</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm sm:text-base"
                  placeholder={t('Nguyễn Văn A')}
                />
              </div>
            )}

            <div className="animate-fade-in-up" style={{ animationDelay: isRegister ? '250ms' : '200ms' }}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('Email')}</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm sm:text-base"
                placeholder={t('email@example.com')}
              />
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: isRegister ? '300ms' : '250ms' }}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('Mật khẩu')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm sm:text-base pr-12"
                  placeholder={t('••••••••')}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] text-sm sm:text-base animate-fade-in-up"
              style={{ animationDelay: isRegister ? '350ms' : '300ms' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('Đang xử lý...')}
                </span>
              ) : (isRegister ? t('Đăng ký') : t('Đăng nhập'))}
            </button>
          </form>

          <div className="mt-5 sm:mt-6 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-sm sm:text-base text-primary-600 hover:text-primary-700 font-medium transition-colors hover:underline"
            >
              {isRegister ? t('Đã có tài khoản? Đăng nhập') : t('Chưa có tài khoản? Đăng ký')}
            </button>
          </div>
        </div>

        <p className="text-center text-primary-200 text-xs sm:text-sm mt-6 animate-fade-in" style={{ animationDelay: '400ms' }}>
          {t('Hệ thống quản lý tài chính cá nhân với AI')}
        </p>
      </div>
    </div>
  );
}
