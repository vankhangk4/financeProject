import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { DashboardStats } from '@/types';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useI18n } from '@/i18n';

export default function Dashboard() {
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleCards, setVisibleCards] = useState(0);

  useEffect(() => {
    api.getDashboardStats()
      .then((data) => setStats(data as DashboardStats))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && stats) {
      const timer = setTimeout(() => setVisibleCards(4), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, stats]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 sm:p-5 h-24">
              <div className="skeleton h-full w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const pieData = stats.top_categories.map((cat) => ({
    name: cat.name,
    value: cat.amount,
    color: cat.color,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 animate-fade-in-up">{t('Tổng quan')}</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger-children">
        <div
          className={`bg-white rounded-xl shadow-sm p-4 sm:p-5 card-hover transition-all duration-500 ${
            visibleCards >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-primary-500 p-2 sm:p-2.5 rounded-lg flex-shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm text-gray-500 truncate">{t('Tổng số dư')}</div>
              <div className="text-sm sm:text-lg font-bold text-gray-900 truncate">{formatCurrency(stats.total_balance)}</div>
            </div>
          </div>
        </div>

        <div
          className={`bg-white rounded-xl shadow-sm p-4 sm:p-5 card-hover transition-all duration-500 ${
            visibleCards >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-income p-2 sm:p-2.5 rounded-lg flex-shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm text-gray-500 truncate">{t('Thu nhập tháng')}</div>
              <div className="text-sm sm:text-lg font-bold text-income truncate">{formatCurrency(stats.monthly_income)}</div>
            </div>
          </div>
        </div>

        <div
          className={`bg-white rounded-xl shadow-sm p-4 sm:p-5 card-hover transition-all duration-500 ${
            visibleCards >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-expense p-2 sm:p-2.5 rounded-lg flex-shrink-0">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm text-gray-500 truncate">{t('Chi tiêu tháng')}</div>
              <div className="text-sm sm:text-lg font-bold text-expense truncate">{formatCurrency(stats.monthly_expense)}</div>
            </div>
          </div>
        </div>

        <div
          className={`bg-white rounded-xl shadow-sm p-4 sm:p-5 card-hover transition-all duration-500 ${
            visibleCards >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-amber-500 p-2 sm:p-2.5 rounded-lg flex-shrink-0">
              <PiggyBank className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm text-gray-500 truncate">{t('Tỷ lệ tiết kiệm')}</div>
              <div className="text-sm sm:text-lg font-bold text-amber-600 truncate">{stats.savings_rate}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Budget alerts */}
      {stats.budget_alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <h3 className="font-semibold text-amber-800 text-sm sm:text-base">{t('Cảnh báo ngân sách')}</h3>
          </div>
          <div className="space-y-2">
            {stats.budget_alerts.map((alert, idx) => (
              <div key={alert.budget.id} className="flex items-center justify-between bg-white rounded-lg p-3 card-hover animate-fade-in">
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-gray-800 text-sm sm:text-base">{alert.budget.category.name}</span>
                  <div className="text-xs sm:text-sm text-gray-500">
                    {t('Đã chi')} {formatCurrency(alert.spent)} / {formatCurrency(alert.budget.amount)}
                  </div>
                </div>
                <span className={`text-sm font-medium ml-2 flex-shrink-0 ${alert.percentage >= 100 ? 'text-red-600' : 'text-amber-600'}`}>
                  {alert.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Category pie chart */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 card-hover animate-fade-in-up">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm sm:text-base">{t('Chi tiêu theo danh mục')}</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
              {t('Chưa có dữ liệu chi tiêu')}
            </div>
          )}
          {pieData.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-1 sm:gap-2">
              {pieData.map((cat, idx) => (
                <div key={cat.name} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm animate-fade-in">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-gray-600 truncate">{cat.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 card-hover animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{t('Giao dịch gần đây')}</h3>
            <Link to="/transactions" className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
              {t('Xem tất cả')} <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Link>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {stats.recent_transactions.length === 0 ? (
              <div className="text-center text-gray-400 py-8 text-sm">{t('Chưa có giao dịch nào')}</div>
            ) : (
              stats.recent_transactions.map((tx, idx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 animate-fade-in"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      tx.transaction_type === 'income' ? 'bg-green-100 text-income' : 'bg-red-100 text-expense'
                    }`}>
                      {tx.transaction_type === 'income' ? <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-800 text-xs sm:text-sm truncate">{tx.category?.name || '—'}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-[180px]">{tx.description || '—'}</div>
                    </div>
                  </div>
                  <span className={`font-medium text-xs sm:text-sm flex-shrink-0 ml-2 ${tx.transaction_type === 'income' ? 'text-income' : 'text-expense'}`}>
                    {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}
