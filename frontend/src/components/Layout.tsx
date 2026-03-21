import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n';
import { useState } from 'react';
import { LayoutDashboard, Receipt, PiggyBank, BarChart3, MessageCircle, LogOut, Wallet, Menu, X, Globe } from 'lucide-react';
import clsx from 'clsx';
import ChatbotPanel from './ChatbotPanel';

const navItems = [
  { path: '/dashboard', labelKey: 'Tổng quan', icon: LayoutDashboard },
  { path: '/transactions', labelKey: 'Giao dịch', icon: Receipt },
  { path: '/budgets', labelKey: 'Ngân sách', icon: PiggyBank },
  { path: '/reports', labelKey: 'Báo cáo', icon: BarChart3 },
  { path: '/chatbot', labelKey: 'Tư vấn', icon: MessageCircle },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useI18n();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between h-14 sm:h-16">
            {/* Logo & mobile menu button */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="sm:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-base sm:text-lg text-gray-900">{t('FinanceManager')}</span>
            </div>

            {/* User actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-sm text-gray-600 hidden sm:block">{user?.name}</span>
              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                title={t('Đăng xuất')}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex max-w-7xl mx-auto">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 sm:hidden modal-backdrop"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={clsx(
            'fixed sm:relative inset-y-0 left-0 z-40 sm:z-auto',
            'w-56 min-h-screen bg-white border-r border-gray-200 py-4 px-3',
            'transition-transform duration-300 ease-in-out',
            'sm:translate-x-0 sm:block',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 sm:hidden p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>

          <nav className="space-y-1 mt-2 sm:mt-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    'hover:scale-[1.02]',
                    isActive
                      ? 'bg-primary-50 text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{t(item.labelKey)}</span>
                </Link>
              );
            })}

            {/* Language toggle */}
            <div className="pt-3 mt-3 border-t border-gray-200">
              <div className="px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Globe className="w-4 h-4" />
                  <span>{lang === 'vi' ? 'Tiếng Việt' : 'English'}</span>
                </div>
                <button
                  onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
                  className={clsx(
                    'relative w-11 h-6 rounded-full transition-colors duration-200',
                    lang === 'vi' ? 'bg-primary-500' : 'bg-blue-500'
                  )}
                >
                  <span
                    className={clsx(
                      'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200',
                      lang === 'vi' ? 'left-0.5' : 'left-[22px]'
                    )}
                  />
                </button>
              </div>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Chatbot Panel */}
      <ChatbotPanel />
    </div>
  );
}
