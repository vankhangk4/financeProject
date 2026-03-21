import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { BudgetProgress, Category } from '@/types';
import { Plus, X } from 'lucide-react';
import { useI18n } from '@/i18n';

export default function Budgets() {
  const { t } = useI18n();
  const [budgets, setBudgets] = useState<BudgetProgress[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category_id: '', amount: '', period: 'monthly' });
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; budgetId: number | null }>({ show: false, budgetId: null });
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bgt, cats] = await Promise.all([
        api.getBudgets(),
        api.getCategories(),
      ]);
      setBudgets(bgt as BudgetProgress[]);
      setCategories(cats as Category[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createBudget({
        category_id: Number(form.category_id),
        amount: Number(form.amount),
        period: form.period,
      });
      setShowModal(false);
      setForm({ category_id: '', amount: '', period: 'monthly' });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleteModal({ show: true, budgetId: id });
    setDeletePassword('');
    setDeleteError('');
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteModal.budgetId) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.deleteBudget(deleteModal.budgetId, deletePassword);
      setDeleteModal({ show: false, budgetId: null });
      loadData();
    } catch (err: any) {
      setDeleteError(err.message || t('Mật khẩu không đúng'));
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('Ngân sách')}</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg hover:bg-primary-700 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline">{t('Thêm ngân sách')}</span>
          <span className="xs:hidden">{t('+ Thêm')}</span>
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center text-gray-400 animate-fade-in-up">
          {t('Chưa có ngân sách nào. Tạo ngân sách để theo dõi chi tiêu theo từng danh mục.')}
        </div>
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 stagger-children">
          {budgets.map((bp, idx) => (
            <div
              key={bp.budget.id}
              className="bg-white rounded-xl shadow-sm p-4 sm:p-5 card-hover animate-fade-in-up"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: bp.budget.category.color }}
                  >
                    {bp.budget.category.name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-800 text-sm sm:text-base truncate">{bp.budget.category.name}</div>
                    <div className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                      {formatCurrency(bp.budget.amount)} / {bp.budget.period === 'monthly' ? t('tháng') : bp.budget.period === 'weekly' ? t('tuần') : t('năm')}
                    </div>
                    <div className="text-xs text-gray-500 sm:hidden">
                      {formatCurrencyShort(bp.budget.amount)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(bp.budget.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all duration-200 active:scale-90 flex-shrink-0 ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress bar */}
              <div className="mb-2">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full progress-fill ${
                      bp.percentage >= 100 ? 'bg-red-500' : bp.percentage >= 80 ? 'bg-amber-500' : 'bg-primary-500'
                    }`}
                    style={{ width: `${Math.min(bp.percentage, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">
                  {t('Đã chi')}: <span className="font-medium">{formatCurrencyShort(bp.spent)}</span>
                </span>
                <span className={`font-medium ${bp.percentage >= 100 ? 'text-red-600' : 'text-gray-600'}`}>
                  {bp.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">
                {t('Còn lại')}: {formatCurrency(bp.remaining)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 modal-backdrop">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md modal-content p-5 sm:p-6">
            <h3 className="font-semibold text-base sm:text-lg mb-2 text-center">{t('Xác nhận xóa ngân sách')}</h3>
            <p className="text-sm text-gray-600 mb-4 text-center hidden sm:block">
              {t('Nhập mật khẩu của bạn để xác nhận xóa ngân sách này.')}
            </p>
            <p className="text-xs text-gray-600 mb-4 text-center sm:hidden">
              {t('Nhập mật khẩu để xác nhận xóa.')}
            </p>
            <form onSubmit={handleConfirmDelete}>
              <input
                type="password"
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder={t('Nhập mật khẩu')}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all mb-3 text-sm"
                autoFocus
              />
              {deleteError && (
                <p className="text-red-500 text-sm mb-3">{deleteError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModal({ show: false, budgetId: null })}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  {t('Hủy')}
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg sm:rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {deleteLoading ? t('Đang xóa...') : t('Xóa')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add budget modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 modal-backdrop">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md modal-content max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl sm:rounded-xl">
              <h3 className="font-semibold text-base sm:text-lg">{t('Thêm ngân sách')}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Danh mục')}</label>
                <select
                  required
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                >
                  <option value="">{t('Chọn danh mục')}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Số tiền giới hạn')}</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="10000"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  placeholder="1000000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Kỳ')}</label>
                <select
                  value={form.period}
                  onChange={(e) => setForm({ ...form, period: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                >
                  <option value="weekly">{t('Hàng tuần')}</option>
                  <option value="monthly">{t('Hàng tháng')}</option>
                  <option value="yearly">{t('Hàng năm')}</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-primary-600 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:bg-primary-700 font-medium transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] text-sm"
              >
                {t('Lưu ngân sách')}
              </button>
            </form>
          </div>
        </div>
      )}
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
