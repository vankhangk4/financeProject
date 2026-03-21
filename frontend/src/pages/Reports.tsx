import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { MonthlyReport, CashFlowPrediction } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { useI18n } from '@/i18n';

export default function Reports() {
  const { t } = useI18n();
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [predictions, setPredictions] = useState<CashFlowPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getMonthlyReports(6),
      api.getCashFlowPrediction(3),
    ]).then(([r, p]) => {
      setReports(r as MonthlyReport[]);
      setPredictions(p as CashFlowPrediction[]);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const chartData = reports.map((r) => ({
    month: r.month.slice(5),
    [t('Thu')]: r.income,
    [t('Chi')]: r.expense,
    [t('Thu nhập ròng')]: r.net,
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 animate-fade-in-up">{t('Báo cáo & Phân tích')}</h1>

      {/* Income vs Expense chart */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 card-hover animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <h3 className="font-semibold text-gray-800 mb-4 text-sm sm:text-base">{t('Thu chi theo tháng')}</h3>
        {chartData.length > 0 ? (
          <div className="h-52 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} width={45} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey={t('Thu')} fill="#22c55e" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <animateTransform key={i} attributeName="transform" type="scale" from="0 1" to="1 1" dur="0.6s" begin={`${i * 0.1}s`} fill="freeze" />
                  ))}
                </Bar>
                <Bar dataKey={t('Chi')} fill="#ef4444" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <animateTransform key={i} attributeName="transform" type="scale" from="0 1" to="1 1" dur="0.6s" begin={`${i * 0.1 + 0.05}s`} fill="freeze" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-52 sm:h-72 flex items-center justify-center text-gray-400 text-sm">{t('Chưa có dữ liệu')}</div>
        )}
      </div>

      {/* Cash flow prediction */}
      {predictions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 card-hover animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <h3 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">{t('Dự đoán dòng tiền (AI)')}</h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">{t('Dự đoán thu chi các tháng tiếp theo')}</p>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={predictions.map((p) => ({
                month: p.month.slice(5),
                [t('Dự kiến thu')]: p.predicted_income,
                [t('Dự kiến chi')]: p.predicted_expense,
              }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} width={45} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey={t('Dự kiến thu')} stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey={t('Dự kiến chi')} stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
            {predictions.map((p, i) => (
              <div key={i} className="px-2 sm:px-3 py-2 bg-gray-50 rounded-lg text-center">
                <div className="text-xs sm:text-sm text-gray-600 font-medium">{p.month}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t('Độ tin:')} {p.confidence}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly breakdown */}
      <div className="space-y-3 sm:space-y-4">
        {reports.map((report, idx) => (
          <div key={report.month} className="bg-white rounded-xl shadow-sm p-4 sm:p-5 card-hover animate-fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h4 className="font-semibold text-gray-800 text-sm sm:text-base">{report.month}</h4>
              <span className={`text-sm sm:text-base font-medium ${report.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {report.net >= 0 ? '+' : ''}{formatCurrency(report.net)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-green-50 rounded-lg">
                <div className="text-xs text-green-600 font-medium">{t('Thu nhập')}</div>
                <div className="text-sm sm:text-lg font-bold text-green-600 truncate">{formatCurrencyShort(report.income)}</div>
              </div>
              <div className="p-2 sm:p-3 bg-red-50 rounded-lg">
                <div className="text-xs text-red-600 font-medium">{t('Chi tiêu')}</div>
                <div className="text-sm sm:text-lg font-bold text-red-600 truncate">{formatCurrencyShort(report.expense)}</div>
              </div>
            </div>
            {report.categories.length > 0 && (
              <div className="space-y-1.5 sm:space-y-2">
                {report.categories.map((cat) => (
                  <div key={cat.category_id} className="flex items-center gap-2 sm:gap-3">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.category_color }} />
                    <span className="text-xs sm:text-sm text-gray-600 flex-1 truncate">{cat.category_name}</span>
                    <span className="text-xs sm:text-sm font-medium text-gray-800 flex-shrink-0">{formatCurrencyShort(cat.total_amount)}</span>
                    <span className="text-xs text-gray-400 w-10 sm:w-12 text-right flex-shrink-0">{cat.percentage}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

function formatCurrencyShort(amount: number): string {
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(0)}K`;
  return new Intl.NumberFormat('vi-VN').format(amount);
}
