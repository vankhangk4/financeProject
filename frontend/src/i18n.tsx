import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'vi' | 'en';

const translations = {
  vi: {
    // Navbar & Layout
    'Tổng quan': 'Tổng quan',
    'Giao dịch': 'Giao dịch',
    'Ngân sách': 'Ngân sách',
    'Báo cáo': 'Báo cáo',
    'Tư vấn': 'Tư vấn',
    'Đăng xuất': 'Đăng xuất',

    // Dashboard
    'Tổng số dư': 'Tổng số dư',
    'Thu nhập tháng': 'Thu nhập tháng',
    'Chi tiêu tháng': 'Chi tiêu tháng',
    'Tỷ lệ tiết kiệm': 'Tỷ lệ tiết kiệm',
    'Cảnh báo ngân sách': 'Cảnh báo ngân sách',
    'Chi tiêu theo danh mục': 'Chi tiêu theo danh mục',
    'Giao dịch gần đây': 'Giao dịch gần đây',
    'Xem tất cả': 'Xem tất cả',
    'Chưa có dữ liệu chi tiêu': 'Chưa có dữ liệu chi tiêu',
    'Chưa có giao dịch nào': 'Chưa có giao dịch nào',
    'Đã chi': 'Đã chi',
    'Còn lại': 'Còn lại',

    // Transactions
    'Tạo tài khoản': 'Tạo tài khoản',
    'Chuyển tiền': 'Chuyển tiền',
    'Thêm giao dịch': 'Thêm giao dịch',
    'Tài khoản của bạn:': 'Tài khoản của bạn:',
    'Chưa có tài khoản nào': 'Chưa có tài khoản nào',
    'Bạn cần tạo ít nhất một tài khoản để thêm giao dịch.': 'Bạn cần tạo ít nhất một tài khoản để thêm giao dịch.',
    'Tạo tài khoản đầu tiên': 'Tạo tài khoản đầu tiên',
    'Chưa có danh mục. Khởi tạo danh mục mặc định?': 'Chưa có danh mục. Khởi tạo danh mục mặc định?',
    'Khởi tạo danh mục': 'Khởi tạo danh mục',
    'Chưa có giao dịch nào.': 'Chưa có giao dịch nào.',
    'Ngày': 'Ngày',
    'Mô tả': 'Mô tả',
    'Danh mục': 'Danh mục',
    'Số tiền': 'Số tiền',
    'Hành động': 'Hành động',
    'Chọn tài khoản': 'Chọn tài khoản',
    'Chọn danh mục': 'Chọn danh mục',
    'Chi tiêu': 'Chi tiêu',
    'Thu nhập': 'Thu nhập',
    'Lưu giao dịch': 'Lưu giao dịch',
    'Đang xử lý...': 'Đang xử lý...',

    // Account modal
    'Sửa tài khoản': 'Sửa tài khoản',
    'Tên tài khoản': 'Tên tài khoản',
    'Ví dụ: Ví tiền mặt': 'Ví dụ: Ví tiền mặt',
    'Loại tài khoản': 'Loại tài khoản',
    'Tiền mặt': 'Tiền mặt',
    'Tài khoản ngân hàng': 'Tài khoản ngân hàng',
    'Tiết kiệm': 'Tiết kiệm',
    'Thẻ tín dụng': 'Thẻ tín dụng',
    'Số dư ban đầu (VND)': 'Số dư ban đầu (VND)',
    '0': '0',
    'Lưu thay đổi': 'Lưu thay đổi',

    // Transfer modal
    'Tài khoản nguồn': 'Tài khoản nguồn',
    'Chọn tài khoản nguồn': 'Chọn tài khoản nguồn',
    'Tài khoản đích': 'Tài khoản đích',
    'Chọn tài khoản đích': 'Chọn tài khoản đích',
    'Mô tả (tùy chọn)': 'Mô tả (tùy chọn)',
    'Ghi chú...': 'Ghi chú...',
    'Chuyển tiền thất bại': 'Chuyển tiền thất bại',

    // Budgets
    'Thêm ngân sách': 'Thêm ngân sách',
    'Chưa có ngân sách nào. Tạo ngân sách để theo dõi chi tiêu theo từng danh mục.': 'Chưa có ngân sách nào. Tạo ngân sách để theo dõi chi tiêu theo từng danh mục.',
    'Số tiền giới hạn': 'Số tiền giới hạn',
    'Kỳ': 'Kỳ',
    'Hàng tuần': 'Hàng tuần',
    'Hàng tháng': 'Hàng tháng',
    'Hàng năm': 'Hàng năm',
    'Lưu ngân sách': 'Lưu ngân sách',
    'Xác nhận xóa ngân sách': 'Xác nhận xóa ngân sách',
    'Nhập mật khẩu của bạn để xác nhận xóa ngân sách này.': 'Nhập mật khẩu của bạn để xác nhận xóa ngân sách này.',
    'Nhập mật khẩu': 'Nhập mật khẩu',
    'Nhập mật khẩu để xác nhận xóa.': 'Nhập mật khẩu để xác nhận xóa.',
    'Mật khẩu không đúng': 'Mật khẩu không đúng',
    'Hủy': 'Hủy',
    'Xóa': 'Xóa',
    'Đang xóa...': 'Đang xóa...',

    // Reports
    'Báo cáo & Phân tích': 'Báo cáo & Phân tích',
    'Thu chi theo tháng': 'Thu chi theo tháng',
    'Dự đoán dòng tiền (AI)': 'Dự đoán dòng tiền (AI)',
    'Dự đoán thu chi các tháng tiếp theo': 'Dự đoán thu chi các tháng tiếp theo',
    'Chưa có dữ liệu': 'Chưa có dữ liệu',
    'Độ tin:': 'Độ tin:',
    'Thu nhập ròng': 'Thu nhập ròng',
    'Thu': 'Thu',
    'Chi': 'Chi',
    'Dự kiến thu': 'Dự kiến thu',
    'Dự kiến chi': 'Dự kiến chi',

    // Chatbot
    'Trợ lý Tài chính': 'Trợ lý Tài chính',
    'chatbot_welcome_title': 'Xin chào! Tôi là trợ lý tài chính cá nhân của bạn. Tôi có thể tư vấn về:',
    'chatbot_welcome_bullets': '\n\n• Lập kế hoạch ngân sách\n• Tiết kiệm và quỹ khẩn cấp\n• Quản lý và trả nợ\n• Đầu tư cơ bản\n• Mục tiêu tài chính\n\nBạn muốn hỏi về chủ đề nào?',
    'Hỏi về tài chính cá nhân...': 'Hỏi về tài chính cá nhân...',
    'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn. Vui lòng thử lại.': 'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn. Vui lòng thử lại.',
    'Xem thêm': 'Xem thêm',

    // Login
    'Đăng nhập': 'Đăng nhập',
    'Đăng ký': 'Đăng ký',
    'Tạo tài khoản mới': 'Tạo tài khoản mới',
    'Họ và tên': 'Họ và tên',
    'Nguyễn Văn A': 'Nguyễn Văn A',
    'Email': 'Email',
    'email@example.com': 'email@example.com',
    'Mật khẩu': 'Mật khẩu',
    '••••••••': '••••••••',
    'Có lỗi xảy ra': 'Có lỗi xảy ra',
    'Đã có tài khoản? Đăng nhập': 'Đã có tài khoản? Đăng nhập',
    'Chưa có tài khoản? Đăng ký': 'Chưa có tài khoản? Đăng ký',
    'Hệ thống quản lý tài chính cá nhân với AI': 'Hệ thống quản lý tài chính cá nhân với AI',
    'Quản lý tài chính cá nhân thông minh': 'Quản lý tài chính cá nhân thông minh',
    'FinanceManager': 'FinanceManager',

    // Suffixes
    'tháng': 'tháng',
    'tuần': 'tuần',
    'năm': 'năm',

    // Chatbot quick questions
    'Làm sao để tiết kiệm hiệu quả?': 'Làm sao để tiết kiệm hiệu quả?',
    'Quỹ khẩn cấp nên có bao nhiêu?': 'Quỹ khẩn cấp nên có bao nhiêu?',
    'Mẹo quản lý chi tiêu hàng tháng?': 'Mẹo quản lý chi tiêu hàng tháng?',
    'Đầu tư gì cho người mới bắt đầu?': 'Đầu tư gì cho người mới bắt đầu?',

    // Chatbot Panel
    'Đóng': 'Đóng',
    'Lịch sử chat': 'Lịch sử chat',
    'Bắt đầu cuộc trò chuyện mới': 'Bắt đầu cuộc trò chuyện mới',
    'Xem báo cáo': 'Xem báo cáo',
    'Tạo ngân sách': 'Tạo ngân sách',
    'Phiên mới': 'Phiên mới',
    'ngày trước': 'ngày trước',
    'tin': 'tin',
  },
  en: {
    // Navbar & Layout
    'Tổng quan': 'Overview',
    'Giao dịch': 'Transactions',
    'Ngân sách': 'Budgets',
    'Báo cáo': 'Reports',
    'Tư vấn': 'Advisor',
    'Đăng xuất': 'Logout',

    // Dashboard
    'Tổng số dư': 'Total Balance',
    'Thu nhập tháng': 'Monthly Income',
    'Chi tiêu tháng': 'Monthly Expense',
    'Tỷ lệ tiết kiệm': 'Savings Rate',
    'Cảnh báo ngân sách': 'Budget Alert',
    'Chi tiêu theo danh mục': 'Expense by Category',
    'Giao dịch gần đây': 'Recent Transactions',
    'Xem tất cả': 'View all',
    'Chưa có dữ liệu chi tiêu': 'No expense data yet',
    'Chưa có giao dịch nào': 'No transactions yet',
    'Đã chi': 'Spent',
    'Còn lại': 'Remaining',

    // Transactions
    'Tạo tài khoản': 'Create Account',
    'Chuyển tiền': 'Transfer',
    'Thêm giao dịch': 'Add Transaction',
    'Tài khoản của bạn:': 'Your accounts:',
    'Chưa có tài khoản nào': 'No accounts yet',
    'Tên tài khoản đã tồn tại': 'Account name already exists',
    'Bạn cần tạo ít nhất một tài khoản để thêm giao dịch.': 'You need to create at least one account to add transactions.',
    'Tạo tài khoản đầu tiên': 'Create your first account',
    'Chưa có danh mục. Khởi tạo danh mục mặc định?': 'No categories yet. Initialize default categories?',
    'Khởi tạo danh mục': 'Initialize Categories',
    'Chưa có giao dịch nào.': 'No transactions yet.',
    'Ngày': 'Date',
    'Mô tả': 'Description',
    'Danh mục': 'Category',
    'Số tiền': 'Amount',
    'Hành động': 'Actions',
    'Chọn tài khoản': 'Select account',
    'Chọn danh mục': 'Select category',
    'Chi tiêu': 'Expense',
    'Thu nhập': 'Income',
    'Lưu giao dịch': 'Save Transaction',
    'Đang xử lý...': 'Processing...',

    // Account modal
    'Tạo tài khoản mới': 'Create New Account',
    'Sửa tài khoản': 'Edit Account',
    'Tên tài khoản': 'Account Name',
    'Ví dụ: Ví tiền mặt': 'e.g. Cash Wallet',
    'Loại tài khoản': 'Account Type',
    'Tiền mặt': 'Cash',
    'Tài khoản ngân hàng': 'Bank Account',
    'Tiết kiệm': 'Savings',
    'Thẻ tín dụng': 'Credit Card',
    'Số dư ban đầu (VND)': 'Initial Balance (VND)',
    '0': '0',
    'Lưu thay đổi': 'Save Changes',

    // Transfer modal
    'Tài khoản nguồn': 'Source Account',
    'Chọn tài khoản nguồn': 'Select source account',
    'Tài khoản đích': 'Destination Account',
    'Chọn tài khoản đích': 'Select destination account',
    'Mô tả (tùy chọn)': 'Description (optional)',
    'Ghi chú...': 'Note...',
    'Chuyển tiền thất bại': 'Transfer failed',

    // Budgets
    'Thêm ngân sách': 'Add Budget',
    '+ Thêm': '+ Add',
    'Chưa có ngân sách nào. Tạo ngân sách để theo dõi chi tiêu theo từng danh mục.': 'No budgets yet. Create a budget to track expenses by category.',
    'Số tiền giới hạn': 'Budget Limit',
    'Kỳ': 'Period',
    'Hàng tuần': 'Weekly',
    'Hàng tháng': 'Monthly',
    'Hàng năm': 'Yearly',
    'Lưu ngân sách': 'Save Budget',
    'Xác nhận xóa ngân sách': 'Confirm Delete Budget',
    'Nhập mật khẩu của bạn để xác nhận xóa ngân sách này.': 'Enter your password to confirm deleting this budget.',
    'Nhập mật khẩu': 'Enter password',
    'Nhập mật khẩu để xác nhận xóa.': 'Enter password to confirm deletion.',
    'Mật khẩu không đúng': 'Incorrect password',
    'Hủy': 'Cancel',
    'Xóa': 'Delete',
    'Đang xóa...': 'Deleting...',

    // Reports
    'Báo cáo & Phân tích': 'Reports & Analysis',
    'Thu chi theo tháng': 'Income & Expense by Month',
    'Dự đoán dòng tiền (AI)': 'Cash Flow Prediction (AI)',
    'Dự đoán thu chi các tháng tiếp theo': 'Predicts income/expense for upcoming months',
    'Chưa có dữ liệu': 'No data yet',
    'Độ tin:': 'Confidence:',
    'Thu nhập ròng': 'Net Income',
    'Thu': 'Income',
    'Chi': 'Expense',
    'Dự kiến thu': 'Predicted Income',
    'Dự kiến chi': 'Predicted Expense',

    // Chatbot
    'Trợ lý Tài chính': 'Financial Advisor',
    'chatbot_welcome_title': 'Hello! I am your personal financial advisor. I can advise on:',
    'chatbot_welcome_bullets': '\n\n• Budget planning\n• Savings and emergency fund\n• Debt management and repayment\n• Basic investing\n• Financial goals\n\nWhat topic would you like to ask about?',
    'Hỏi về tài chính cá nhân...': 'Ask about personal finance...',
    'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn. Vui lòng thử lại.': 'Sorry, I encountered an error processing your request. Please try again.',
    'Xem thêm': 'See more',

    // Login
    'Đăng nhập': 'Login',
    'Đăng ký': 'Register',
    'Họ và tên': 'Full Name',
    'Nguyễn Văn A': 'John Doe',
    'Email': 'Email',
    'email@example.com': 'email@example.com',
    'Mật khẩu': 'Password',
    '••••••••': '••••••••',
    'Có lỗi xảy ra': 'An error occurred',
    'Đã có tài khoản? Đăng nhập': 'Already have an account? Login',
    'Chưa có tài khoản? Đăng ký': "Don't have an account? Register",
    'Hệ thống quản lý tài chính cá nhân với AI': 'AI-Powered Personal Finance Management System',
    'Quản lý tài chính cá nhân thông minh': 'Smart Personal Finance Management',
    'FinanceManager': 'FinanceManager',

    // Suffixes
    'tháng': 'month',
    'tuần': 'week',
    'năm': 'year',

    // Chatbot quick questions
    'Làm sao để tiết kiệm hiệu quả?': 'How to save effectively?',
    'Quỹ khẩn cấp nên có bao nhiêu?': 'How much should an emergency fund be?',
    'Mẹo quản lý chi tiêu hàng tháng?': 'Tips for managing monthly expenses?',
    'Đầu tư gì cho người mới bắt đầu?': 'What to invest in for beginners?',

    // Chatbot Panel
    'Đóng': 'Close',
    'Lịch sử chat': 'Chat History',
    'Bắt đầu cuộc trò chuyện mới': 'Start new conversation',
    'Xem báo cáo': 'View Reports',
    'Tạo ngân sách': 'Create Budget',
    'Phiên mới': 'New Session',
    'ngày trước': 'days ago',
    'tin': 'msgs',
  },
};

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'vi',
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('lang');
    return (saved === 'en' ? 'en' : 'vi') as Language;
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('lang', newLang);
  };

  const t = (key: string): string => {
    return (translations as Record<Language, Record<string, string>>)[lang][key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
