import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Transaction, Category, Account, TransactionType } from '@/types';
import { Plus, Trash2, X, Sparkles, Wallet, Pencil, ArrowLeftRight } from 'lucide-react';
import { format } from 'date-fns';
import { useI18n } from '@/i18n';

export default function Transactions() {
  const { t } = useI18n();

  const ACCOUNT_TYPES = [
    { value: 'cash', label: t('Tiền mặt') },
    { value: 'checking', label: t('Tài khoản ngân hàng') },
    { value: 'savings', label: t('Tiết kiệm') },
    { value: 'credit', label: t('Thẻ tín dụng') },
  ];

  // Shadowing alias for i18n to avoid conflict with array.find callback
  const __ = t;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountError, setAccountError] = useState('');
  const [accountForm, setAccountForm] = useState({
    name: '',
    account_type: 'cash',
  });
  const [form, setForm] = useState<{
    account_id: string;
    category_id: string;
    amount: string;
    transaction_type: TransactionType;
    description: string;
    date: string;
  }>({
    account_id: '',
    category_id: '',
    amount: '',
    transaction_type: 'expense',
    description: '',
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferForm, setTransferForm] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    description: '',
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  });
  const [transferError, setTransferError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [txs, cats, accs] = await Promise.all([
        api.getTransactions(),
        api.getCategories(),
        api.getAccounts(),
      ]);
      setTransactions(txs as Transaction[]);
      setCategories(cats as Category[]);
      setAccounts(accs as Account[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountLoading(true);
    try {
      await api.createAccount({
        name: accountForm.name,
        account_type: accountForm.account_type,
      });
      setShowAccountModal(false);
      setAccountForm({ name: '', account_type: 'cash' });
      setAccountError('');
      await loadData();
    } catch (e: any) {
      setAccountError(e.message || t('Có lỗi xảy ra'));
    } finally {
      setAccountLoading(false);
    }
  };

  const handleEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccountForm({
      name: acc.name,
      account_type: acc.account_type,
    });
    setShowAccountModal(true);
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setAccountLoading(true);
    try {
      await api.updateAccount(editingAccount.id, {
        name: accountForm.name,
        account_type: accountForm.account_type,
      });
      setShowAccountModal(false);
      setEditingAccount(null);
      setAccountForm({ name: '', account_type: 'cash' });
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setAccountLoading(false);
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!confirm(t('Xóa tài khoản này? Tất cả giao dịch liên quan sẽ bị xóa.'))) return;
    try {
      await api.deleteAccount(id);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTransaction({
        account_id: Number(form.account_id),
        category_id: form.category_id ? Number(form.category_id) : undefined,
        amount: Number(form.amount),
        transaction_type: form.transaction_type,
        description: form.description || undefined,
        date: new Date(form.date).toISOString(),
      });
      setShowModal(false);
      setForm({ account_id: '', category_id: '', amount: '', transaction_type: 'expense', description: '', date: format(new Date(), "yyyy-MM-dd'T'HH:mm") });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('Xóa giao dịch này?'))) return;
    await api.deleteTransaction(id);
    await loadData();
  };

  const handleAICategorize = async () => {
    if (!form.description) return;
    setAiLoading(true);
    try {
      const result = await api.categorizeTransaction(form.description, form.amount ? Number(form.amount) : undefined) as any;
      setForm((f) => ({ ...f, category_id: String(result.category_id) }));
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleInitCategories = async () => {
    try {
      await api.initDefaultCategories();
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferLoading(true);
    setTransferError('');
    try {
      await api.transfer({
        from_account_id: Number(transferForm.from_account_id),
        to_account_id: Number(transferForm.to_account_id),
        amount: Number(transferForm.amount),
        description: transferForm.description || undefined,
        date: new Date(transferForm.date).toISOString(),
      });
      setShowTransferModal(false);
      setTransferForm({ from_account_id: '', to_account_id: '', amount: '', description: '', date: format(new Date(), "yyyy-MM-dd'T'HH:mm") });
      await loadData();
    } catch (err: any) {
      setTransferError(err.message || t('Chuyển tiền thất bại'));
    } finally {
      setTransferLoading(false);
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
      <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 animate-fade-in-up">{t('Giao dịch')}</h1>
        <div className="flex flex-wrap gap-2 w-full xs:w-auto">
          <button
            onClick={() => setShowAccountModal(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg hover:bg-green-700 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-medium text-sm w-full xs:w-auto justify-center"
          >
            <Wallet className="w-4 h-4" />
            <span className="hidden xs:inline">{t('Tạo tài khoản')}</span>
            <span className="xs:hidden">+ {t('Tài khoản')}</span>
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg hover:bg-purple-700 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-medium text-sm w-full xs:w-auto justify-center"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span className="hidden xs:inline">{t('Chuyển tiền')}</span>
            <span className="xs:hidden">{t('Chuyển')}</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg hover:bg-primary-700 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-medium text-sm w-full xs:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">{t('Thêm giao dịch')}</span>
            <span className="xs:hidden">+ {t('Giao dịch')}</span>
          </button>
        </div>
      </div>

      {/* Accounts display */}
      {accounts.length > 0 && (
        <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <span className="text-xs sm:text-sm font-medium text-gray-700">{t('Tài khoản của bạn:')}</span>
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {accounts.map((acc, idx) => (
              <div key={acc.id} className="px-3 sm:px-4 py-2.5 sm:py-3 bg-white rounded-lg sm:rounded-xl border border-gray-200 text-sm flex items-center justify-between card-hover animate-fade-in" style={{ animationDelay: `${idx * 60}ms` }}>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-800 text-xs sm:text-sm truncate">{acc.name}</div>
                  <div className="text-gray-500 text-xs hidden sm:block">
                    {ACCOUNT_TYPES.find(a => a.value === acc.account_type)?.label || acc.account_type}
                  </div>
                  <div className="text-primary-600 font-semibold mt-0.5 text-xs sm:text-sm">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(acc.balance)}
                  </div>
                </div>
                <div className="flex gap-1 ml-2 flex-shrink-0">
                  <button
                    onClick={() => handleEditAccount(acc)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 active:scale-90"
                    title={t('Sửa')}
                  >
                    <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(acc.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 active:scale-90"
                    title={t('Xóa')}
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {accounts.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6 text-center animate-fade-in-up">
          <Wallet className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="font-semibold text-amber-800 mb-2 text-sm sm:text-base">{t('Chưa có tài khoản nào')}</h3>
          <p className="text-sm text-amber-600 mb-4 hidden sm:block">{t('Bạn cần tạo ít nhất một tài khoản để thêm giao dịch.')}</p>
          <button
            onClick={() => setShowAccountModal(true)}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 font-medium text-sm transition-colors"
          >
            {t('Tạo tài khoản đầu tiên')}
          </button>
        </div>
      )}

      {/* Categories quick init */}
      {categories.length === 0 && accounts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 text-center animate-fade-in-up">
          <p className="text-sm text-blue-600 mb-2">{t('Chưa có danh mục. Khởi tạo danh mục mặc định?')}</p>
          <button
            onClick={handleInitCategories}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
          >
            {t('Khởi tạo danh mục')}
          </button>
        </div>
      )}

      {/* Transaction list - Mobile card view, Desktop table view */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        {transactions.length === 0 ? (
          <div className="text-center text-gray-400 py-12 sm:py-16 text-sm">
            {t('Chưa có giao dịch nào.')}
          </div>
        ) : (
          <>
            {/* Mobile: card view */}
            <div className="sm:hidden divide-y divide-gray-100">
              {transactions.map((tx, idx) => (
                <div key={tx.id} className="p-3 animate-fade-in" style={{ animationDelay: `${idx * 40}ms` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        tx.transaction_type === 'income' ? 'bg-green-100 text-income' : 'bg-red-100 text-expense'
                      }`}>
                        {tx.transaction_type === 'income' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {tx.category && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-white flex-shrink-0"
                              style={{ backgroundColor: tx.category.color }}
                            >
                              {tx.category.name}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 truncate">{format(new Date(tx.date), 'dd/MM/yy HH:mm')}</span>
                        </div>
                        <div className="text-xs text-gray-500 truncate">{tx.description || '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className={`font-semibold text-sm ${tx.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table view */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Ngày')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Mô tả')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Danh mục')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Số tiền')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-16">{t('Hành động')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx, idx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors duration-150 animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
                      <td className="px-4 py-3 text-xs sm:text-sm text-gray-600 whitespace-nowrap">{format(new Date(tx.date), 'dd/MM/yyyy HH:mm')}</td>
                      <td className="px-4 py-3 text-xs sm:text-sm font-medium text-gray-800 max-w-[200px] truncate">{tx.description || '—'}</td>
                      <td className="px-4 py-3">
                        {tx.category ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: tx.category.color }}
                          >
                            {tx.category.name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-xs sm:text-sm font-medium text-right whitespace-nowrap ${tx.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-all duration-200 active:scale-90"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 modal-backdrop">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md modal-content max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl sm:rounded-xl">
              <h3 className="font-semibold text-base sm:text-lg">{editingAccount ? t('Sửa tài khoản') : t('Tạo tài khoản mới')}</h3>
              <button onClick={() => { setShowAccountModal(false); setEditingAccount(null); setAccountForm({ name: '', account_type: 'cash' }); setAccountError(''); }} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={editingAccount ? handleUpdateAccount : handleCreateAccount} className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Tên tài khoản')}</label>
                <input
                  type="text"
                  required
                  value={accountForm.name}
                  onChange={(e) => { setAccountForm({ ...accountForm, name: e.target.value }); setAccountError(''); }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  placeholder={t('Ví dụ: Ví tiền mặt')}
                />
                {accountError && (
                  <p className="mt-1 text-sm text-red-500">{accountError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Loại tài khoản')}</label>
                <select
                  value={accountForm.account_type}
                  onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                >
                  {ACCOUNT_TYPES.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={accountLoading}
                className="w-full bg-green-600 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:bg-green-700 font-medium transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {accountLoading ? t('Đang xử lý...') : (editingAccount ? t('Lưu thay đổi') : t('Tạo tài khoản'))}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 modal-backdrop">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md modal-content max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl sm:rounded-xl">
              <h3 className="font-semibold text-base sm:text-lg">{t('Thêm giao dịch')}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
              {/* Type toggle */}
              <div className="flex gap-1.5 p-1.5 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, transaction_type: 'expense' })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    form.transaction_type === 'expense' ? 'bg-white shadow-md text-red-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('Chi tiêu')}
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, transaction_type: 'income' })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    form.transaction_type === 'income' ? 'bg-white shadow-md text-green-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('Thu nhập')}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Tài khoản')}</label>
                <select
                  required
                  value={form.account_id}
                  onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                >
                  <option value="">{t('Chọn tài khoản')}</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Số tiền (VND)')}</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  placeholder="0"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('Danh mục')}</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  >
                    <option value="">{t('Chọn danh mục')}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <button
                    type="button"
                    onClick={handleAICategorize}
                    disabled={!form.description || aiLoading}
                    className="p-2.5 text-primary-600 hover:bg-primary-50 rounded-lg disabled:opacity-50 transition-all duration-200 active:scale-90"
                    title={t('Phân loại tự động bằng AI')}
                  >
                    {aiLoading ? (
                      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Mô tả')}</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  placeholder="Mua cơm trưa..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Ngày')}</label>
                <input
                  type="datetime-local"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary-600 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:bg-primary-700 font-medium transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
              >
                {t('Lưu giao dịch')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 modal-backdrop">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md modal-content max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl sm:rounded-xl">
              <h3 className="font-semibold text-base sm:text-lg">{t('Chuyển tiền')}</h3>
              <button onClick={() => { setShowTransferModal(false); setTransferError(''); }} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Tài khoản nguồn')}</label>
                <select
                  required
                  value={transferForm.from_account_id}
                  onChange={(e) => setTransferForm({ ...transferForm, from_account_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-sm"
                >
                  <option value="">{t('Chọn tài khoản nguồn')}</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name} - {formatCurrency(acc.balance)}</option>
                  ))}
                </select>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 text-purple-600 rotate-90" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Tài khoản đích')}</label>
                <select
                  required
                  value={transferForm.to_account_id}
                  onChange={(e) => setTransferForm({ ...transferForm, to_account_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-sm"
                >
                  <option value="">{t('Chọn tài khoản đích')}</option>
                  {accounts.filter(a => a.id !== Number(transferForm.from_account_id)).map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name} - {formatCurrency(acc.balance)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Số tiền (VND)')}</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-sm"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Mô tả (tùy chọn)')}</label>
                <input
                  type="text"
                  value={transferForm.description}
                  onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-sm"
                  placeholder={t('Ghi chú...')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Ngày')}</label>
                <input
                  type="datetime-local"
                  required
                  value={transferForm.date}
                  onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-sm"
                />
              </div>

              {transferError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {transferError}
                </div>
              )}

              <button
                type="submit"
                disabled={transferLoading || !transferForm.from_account_id || !transferForm.to_account_id}
                className="w-full bg-purple-600 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:bg-purple-700 font-medium transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transferLoading ? t('Đang xử lý...') : t('Chuyển tiền')}
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
