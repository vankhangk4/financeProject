# TÀI LIỆU KIỂM THỬ - HỆ THỐNG QUẢN LÝ TÀI CHÍNH CÁ NHÂN THÔNG MINH

> Tài liệu này mô tả chi tiết các test case để kiểm thử hệ thống, bao gồm: kiểm thử chức năng (Backend API, Frontend UI), kiểm thử tích hợp, kiểm thử AI, kiểm thử phi chức năng.

---

## 1. KIỂM THỬ MODULE ĐĂNG KÝ & ĐĂNG NHẬP (Authentication)

### 1.1 Đăng ký tài khoản (POST /api/v1/auth/register)

| TC-ID | Mô tả | Dữ liệu đầu vào | Kết quả mong đợi | Mức độ |
|-------|--------|-------------------|-------------------|--------|
| TC-AUTH-001 | Đăng ký thành công với dữ liệu hợp lệ | email: "test@gmail.com", password: "123456", name: "Nguyễn Văn A" | HTTP 201, trả về thông tin user (id, email, name) | Cao |
| TC-AUTH-002 | Đăng ký với email đã tồn tại | email: "test@gmail.com" (đã đăng ký), password: "123456", name: "Test" | HTTP 400, thông báo "Email đã được sử dụng" | Cao |
| TC-AUTH-003 | Đăng ký với email không đúng định dạng | email: "invalidemail", password: "123456", name: "Test" | HTTP 422, lỗi validation email | Cao |
| TC-AUTH-004 | Đăng ký với mật khẩu < 6 ký tự | email: "new@gmail.com", password: "123", name: "Test" | HTTP 422, lỗi validation mật khẩu | Cao |
| TC-AUTH-005 | Đăng ký thiếu trường bắt buộc (email) | password: "123456", name: "Test" | HTTP 422, lỗi thiếu trường email | Trung bình |
| TC-AUTH-006 | Đăng ký thiếu trường bắt buộc (password) | email: "new@gmail.com", name: "Test" | HTTP 422, lỗi thiếu trường password | Trung bình |
| TC-AUTH-007 | Đăng ký thiếu trường bắt buộc (name) | email: "new@gmail.com", password: "123456" | HTTP 422, lỗi thiếu trường name | Trung bình |
| TC-AUTH-008 | Kiểm tra mật khẩu được hash (bcrypt) | Đăng ký thành công, kiểm tra DB | password_hash khác password nhập vào, bắt đầu bằng "$2b$" | Cao |

### 1.2 Đăng nhập (POST /api/v1/auth/login)

| TC-ID | Mô tả | Dữ liệu đầu vào | Kết quả mong đợi | Mức độ |
|-------|--------|-------------------|-------------------|--------|
| TC-AUTH-009 | Đăng nhập thành công | email: "test@gmail.com", password: "123456" | HTTP 200, trả về access_token và token_type: "bearer" | Cao |
| TC-AUTH-010 | Đăng nhập với email không tồn tại | email: "noexist@gmail.com", password: "123456" | HTTP 401, thông báo lỗi xác thực | Cao |
| TC-AUTH-011 | Đăng nhập với mật khẩu sai | email: "test@gmail.com", password: "wrongpass" | HTTP 401, thông báo lỗi xác thực | Cao |
| TC-AUTH-012 | Đăng nhập với email rỗng | email: "", password: "123456" | HTTP 422, lỗi validation | Trung bình |
| TC-AUTH-013 | Đăng nhập với password rỗng | email: "test@gmail.com", password: "" | HTTP 422, lỗi validation | Trung bình |

### 1.3 Xác thực token (GET /api/v1/auth/me)

| TC-ID | Mô tả | Dữ liệu đầu vào | Kết quả mong đợi | Mức độ |
|-------|--------|-------------------|-------------------|--------|
| TC-AUTH-014 | Lấy thông tin user với token hợp lệ | Header: Authorization: Bearer \<valid_token\> | HTTP 200, trả về thông tin user (id, email, name) | Cao |
| TC-AUTH-015 | Gọi API với token hết hạn | Header: Authorization: Bearer \<expired_token\> | HTTP 401, Unauthorized | Cao |
| TC-AUTH-016 | Gọi API không có token | Không có header Authorization | HTTP 401 hoặc 403 | Cao |
| TC-AUTH-017 | Gọi API với token giả mạo | Header: Authorization: Bearer "faketoken123" | HTTP 401, Unauthorized | Cao |

---

## 2. KIỂM THỬ MODULE QUẢN LÝ TÀI KHOẢN (Accounts)

### 2.1 API Tài khoản

| TC-ID | Mô tả | Dữ liệu đầu vào | Kết quả mong đợi | Mức độ |
|-------|--------|-------------------|-------------------|--------|
| TC-ACC-001 | Tạo tài khoản tài chính mới (checking) | name: "Ví tiền mặt", account_type: "cash", balance: 5000000, currency: "VND" | HTTP 201, tài khoản được tạo với đầy đủ thông tin | Cao |
| TC-ACC-002 | Tạo tài khoản loại savings | name: "Tài khoản tiết kiệm", account_type: "savings", balance: 10000000 | HTTP 201, account_type = "savings" | Cao |
| TC-ACC-003 | Tạo tài khoản loại credit | name: "Thẻ tín dụng", account_type: "credit", balance: 0 | HTTP 201, account_type = "credit" | Cao |
| TC-ACC-004 | Tạo tài khoản thiếu tên | account_type: "cash", balance: 0 | HTTP 422, lỗi validation | Trung bình |
| TC-ACC-005 | Lấy danh sách tài khoản | GET /accounts/ với token hợp lệ | HTTP 200, trả về danh sách accounts của user hiện tại | Cao |
| TC-ACC-006 | Xem chi tiết tài khoản | GET /accounts/{id} | HTTP 200, trả về thông tin chi tiết account | Trung bình |
| TC-ACC-007 | Xem tài khoản của người khác | GET /accounts/{id_of_other_user} | HTTP 404 hoặc 403 (data isolation) | Cao |
| TC-ACC-008 | Cập nhật tên tài khoản | PUT /accounts/{id}, name: "Ví mới" | HTTP 200, tên được cập nhật | Trung bình |
| TC-ACC-009 | Xóa tài khoản | DELETE /accounts/{id} | HTTP 204, tài khoản bị xóa | Trung bình |
| TC-ACC-010 | Xóa tài khoản của người khác | DELETE /accounts/{id_of_other_user} | HTTP 404 hoặc 403 | Cao |

---

## 3. KIỂM THỬ MODULE QUẢN LÝ DANH MỤC (Categories)

| TC-ID | Mô tả | Dữ liệu đầu vào | Kết quả mong đợi | Mức độ |
|-------|--------|-------------------|-------------------|--------|
| TC-CAT-001 | Tạo danh mục mới | name: "Ăn uống", icon: "🍔", color: "#FF5733" | HTTP 201, danh mục được tạo | Cao |
| TC-CAT-002 | Tạo danh mục con (sub-category) | name: "Cơm trưa", parent_id: \<id_anuong\> | HTTP 201, parent_id đúng | Trung bình |
| TC-CAT-003 | Khởi tạo danh mục mặc định | POST /categories/init-default | HTTP 201, tạo danh mục hệ thống (is_system = true) | Cao |
| TC-CAT-004 | Lấy danh sách danh mục | GET /categories/ | HTTP 200, trả về danh sách categories của user | Cao |
| TC-CAT-005 | Tạo danh mục thiếu tên | icon: "🍔" (không có name) | HTTP 422, lỗi validation | Trung bình |
| TC-CAT-006 | Tạo danh mục trùng tên | name: "Ăn uống" (đã tồn tại) | Tùy logic: cho phép hoặc báo lỗi | Thấp |
| TC-CAT-007 | Xem danh mục của người khác | Dùng token user A, truy cập category user B | Không trả về dữ liệu (data isolation) | Cao |

---

## 4. KIỂM THỬ MODULE QUẢN LÝ GIAO DỊCH (Transactions)

### 4.1 Tạo giao dịch

| TC-ID | Mô tả | Dữ liệu đầu vào | Kết quả mong đợi | Mức độ |
|-------|--------|-------------------|-------------------|--------|
| TC-TX-001 | Tạo giao dịch chi tiêu hợp lệ | account_id, category_id, amount: 100000, type: "expense", description: "Cơm trưa", date: "2026-03-20" | HTTP 201, giao dịch được tạo, account balance giảm 100000 | Cao |
| TC-TX-002 | Tạo giao dịch thu nhập hợp lệ | account_id, category_id, amount: 5000000, type: "income", description: "Lương tháng 3" | HTTP 201, giao dịch được tạo, account balance tăng 5000000 | Cao |
| TC-TX-003 | Tạo giao dịch với amount = 0 | amount: 0 | HTTP 422, lỗi "amount phải > 0" | Trung bình |
| TC-TX-004 | Tạo giao dịch với amount âm | amount: -50000 | HTTP 422, lỗi validation | Trung bình |
| TC-TX-005 | Tạo giao dịch với account_id không thuộc user | account_id của user khác | HTTP 404 hoặc 403 | Cao |
| TC-TX-006 | Tạo giao dịch thiếu account_id | Không truyền account_id | HTTP 422, lỗi validation | Trung bình |
| TC-TX-007 | Kiểm tra auto-update balance khi tạo expense | Tạo expense 200000, balance ban đầu = 1000000 | Balance sau = 800000 | Cao |
| TC-TX-008 | Kiểm tra auto-update balance khi tạo income | Tạo income 500000, balance ban đầu = 1000000 | Balance sau = 1500000 | Cao |

### 4.2 Xem / Lọc giao dịch

| TC-ID | Mô tả | Dữ liệu đầu vào | Kết quả mong đợi | Mức độ |
|-------|--------|-------------------|-------------------|--------|
| TC-TX-009 | Lấy danh sách giao dịch (không filter) | GET /transactions/ | HTTP 200, trả về danh sách phân trang (mặc định 50/trang), sắp xếp mới nhất trước | Cao |
| TC-TX-010 | Lọc giao dịch theo tài khoản | GET /transactions/?account_id=X | HTTP 200, chỉ trả về giao dịch của account X | Trung bình |
| TC-TX-011 | Lọc giao dịch theo danh mục | GET /transactions/?category_id=Y | HTTP 200, chỉ trả về giao dịch thuộc category Y | Trung bình |
| TC-TX-012 | Lọc giao dịch theo loại (expense) | GET /transactions/?type=expense | HTTP 200, chỉ trả về giao dịch chi | Trung bình |
| TC-TX-013 | Lọc giao dịch theo khoảng thời gian | GET /transactions/?start_date=2026-01-01&end_date=2026-03-31 | HTTP 200, chỉ trả về giao dịch trong Q1/2026 | Trung bình |
| TC-TX-014 | Phân trang giao dịch | GET /transactions/?page=2&page_size=10 | HTTP 200, trả về trang 2 với tối đa 10 giao dịch | Trung bình |

### 4.3 Sửa / Xóa giao dịch

| TC-ID | Mô tả | Dữ liệu đầu vào | Kết quả mong đợi | Mức độ |
|-------|--------|-------------------|-------------------|--------|
| TC-TX-015 | Cập nhật giao dịch | PUT /transactions/{id}, amount: 150000 | HTTP 200, giao dịch cập nhật, balance điều chỉnh tương ứng | Cao |
| TC-TX-016 | Xóa giao dịch expense | DELETE /transactions/{id} | HTTP 204, balance tài khoản được hoàn lại (cộng lại amount) | Cao |
| TC-TX-017 | Xóa giao dịch income | DELETE /transactions/{id} | HTTP 204, balance tài khoản bị trừ (trừ amount) | Cao |
| TC-TX-018 | Sửa giao dịch của người khác | PUT /transactions/{id_of_other_user} | HTTP 404 hoặc 403 | Cao |
| TC-TX-019 | Xóa giao dịch của người khác | DELETE /transactions/{id_of_other_user} | HTTP 404 hoặc 403 | Cao |

---

## 5. KIỂM THỬ MODULE QUẢN LÝ NGÂN SÁCH (Budgets)

| TC-ID | Mô tả | Dữ liệu đầu vào | Kết quả mong đợi | Mức độ |
|-------|--------|-------------------|-------------------|--------|
| TC-BUD-001 | Tạo ngân sách hàng tháng | category_id, amount: 2000000, period: "monthly" | HTTP 201, ngân sách được tạo | Cao |
| TC-BUD-002 | Tạo ngân sách hàng tuần | category_id, amount: 500000, period: "weekly" | HTTP 201, period = "weekly" | Trung bình |
| TC-BUD-003 | Tạo ngân sách hàng năm | category_id, amount: 24000000, period: "yearly" | HTTP 201, period = "yearly" | Trung bình |
| TC-BUD-004 | Xem danh sách ngân sách với tiến độ | GET /budgets/ | HTTP 200, mỗi budget có: spent, remaining, percentage | Cao |
| TC-BUD-005 | Kiểm tra cảnh báo 80% | Tạo budget 1000000, chi tiêu 800000 trong danh mục tương ứng | Tiến độ = 80%, hiển thị cảnh báo mức trung bình | Cao |
| TC-BUD-006 | Kiểm tra cảnh báo 100%+ | Tạo budget 1000000, chi tiêu 1100000 | Tiến độ = 110%, hiển thị cảnh báo mức cao | Cao |
| TC-BUD-007 | Cập nhật ngân sách | PUT /budgets/{id}, amount: 3000000 | HTTP 200, amount được cập nhật | Trung bình |
| TC-BUD-008 | Xóa ngân sách | DELETE /budgets/{id} | HTTP 204, ngân sách bị xóa | Trung bình |

---

## 6. KIỂM THỬ MODULE DASHBOARD & BÁO CÁO

### 6.1 Dashboard (GET /api/v1/dashboard/stats)

| TC-ID | Mô tả | Dữ liệu đầu vào | Kết quả mong đợi | Mức độ |
|-------|--------|-------------------|-------------------|--------|
| TC-DASH-001 | Dashboard với user mới (chưa có dữ liệu) | User chưa có giao dịch nào | HTTP 200, tất cả giá trị = 0 hoặc rỗng, empty state | Cao |
| TC-DASH-002 | Tổng số dư tất cả tài khoản | User có 2 accounts: 5000000 và 3000000 | total_balance = 8000000 | Cao |
| TC-DASH-003 | Thu nhập tháng hiện tại | User có 2 giao dịch income trong tháng: 5000000 + 2000000 | monthly_income = 7000000 | Cao |
| TC-DASH-004 | Chi tiêu tháng hiện tại | User có 3 giao dịch expense trong tháng: 100k + 200k + 300k | monthly_expense = 600000 | Cao |
| TC-DASH-005 | Tỷ lệ tiết kiệm | Income = 7000000, Expense = 600000 | savings_rate ≈ 91.4% | Trung bình |
| TC-DASH-006 | Top 5 danh mục chi tiêu | User có giao dịch ở 7 danh mục | Trả về đúng 5 danh mục có tổng chi tiêu cao nhất | Trung bình |
| TC-DASH-007 | Giao dịch gần đây | User có 10 giao dịch | Trả về 5-10 giao dịch mới nhất | Trung bình |
| TC-DASH-008 | Cảnh báo ngân sách trên dashboard | Có budget vượt 80% | Dashboard hiển thị budget alerts | Cao |

### 6.2 Báo cáo (GET /api/v1/reports/monthly)

| TC-ID | Mô tả | Dữ liệu đầu vào | Kết quả mong đợi | Mức độ |
|-------|--------|-------------------|-------------------|--------|
| TC-RPT-001 | Báo cáo tháng hiện tại | GET /reports/monthly | HTTP 200, trả về income, expense, breakdown theo danh mục | Cao |
| TC-RPT-002 | Báo cáo tháng cụ thể | GET /reports/monthly?month=2026-01 | HTTP 200, dữ liệu của tháng 1/2026 | Trung bình |
| TC-RPT-003 | So sánh nhiều tháng | GET /reports/monthly?months=6 | HTTP 200, dữ liệu 6 tháng gần nhất | Trung bình |
| TC-RPT-004 | Báo cáo tháng không có dữ liệu | Tháng không có giao dịch nào | HTTP 200, income = 0, expense = 0 | Trung bình |

---

## 7. KIỂM THỬ MODULE AI

### 7.1 AI Phân loại giao dịch (POST /api/v1/ai/categorize)

| TC-ID | Mô tả | Dữ liệu đầu vào | Kết quả mong đợi | Mức độ |
|-------|--------|-------------------|-------------------|--------|
| TC-AI-001 | Phân loại giao dịch "ăn uống" | description: "Cơm trưa văn phòng" | HTTP 200, category_id tương ứng "Ăn uống", confidence > 0 | Cao |
| TC-AI-002 | Phân loại giao dịch "di chuyển" | description: "Grab đi làm" | HTTP 200, category_id tương ứng "Di chuyển" | Cao |
| TC-AI-003 | Phân loại giao dịch "lương" | description: "Lương tháng 3 công ty ABC" | HTTP 200, category_id tương ứng "Thu nhập" | Cao |
| TC-AI-004 | Phân loại mô tả mơ hồ | description: "abc xyz 123" | HTTP 200, trả về kết quả với confidence thấp | Trung bình |
| TC-AI-005 | Phân loại với mô tả rỗng | description: "" | HTTP 422 hoặc trả về fallback category | Trung bình |
| TC-AI-006 | Kiểm tra confidence score | Bất kỳ mô tả hợp lệ | confidence nằm trong [0, 1] | Cao |

### 7.2 Huấn luyện mô hình (POST /api/v1/ai/train-classifier)

| TC-ID | Mô tả | Dữ liệu đầu vào | Kết quả mong đợi | Mức độ |
|-------|--------|-------------------|-------------------|--------|
| TC-AI-007 | Train classifier với đủ dữ liệu | User có ≥ 10 giao dịch đã gán nhãn | HTTP 200, trả về training metrics (accuracy, samples_count) | Cao |
| TC-AI-008 | Train classifier với ít dữ liệu | User có < 10 giao dịch | HTTP 400, thông báo cần thêm dữ liệu | Cao |
| TC-AI-009 | Kiểm tra accuracy sau training | 100+ giao dịch gán nhãn chính xác | Accuracy ≥ 80% | Cao |

### 7.3 Dự đoán dòng tiền (GET /api/v1/ai/predict-cashflow)

| TC-ID | Mô tả | Dữ liệu đầu vào | Kết quả mong đợi | Mức độ |
|-------|--------|-------------------|-------------------|--------|
| TC-AI-010 | Dự đoán với đủ dữ liệu (≥ 30 giao dịch) | User có 6 tháng lịch sử | HTTP 200, mảng predictions với month, predicted_income, predicted_expense | Cao |
| TC-AI-011 | Dự đoán với ít dữ liệu (< 30 giao dịch) | User có < 30 giao dịch | HTTP 400 hoặc trả về cảnh báo không đủ dữ liệu | Trung bình |
| TC-AI-012 | Kiểm tra format output | Dự đoán 3 tháng | Mỗi phần tử có: month, predicted_income, predicted_expense, confidence | Trung bình |
| TC-AI-013 | Kiểm tra giá trị hợp lý | Lịch sử income ~7M/tháng | predicted_income nằm trong khoảng hợp lý so với lịch sử | Trung bình |

### 7.4 Phát hiện bất thường (GET /api/v1/ai/anomaly-alerts)

| TC-ID | Mô tả | Dữ liệu đầu vào | Kết quả mong đợi | Mức độ |
|-------|--------|-------------------|-------------------|--------|
| TC-AI-014 | Lấy danh sách cảnh báo bất thường | User có lịch sử giao dịch đủ | HTTP 200, mảng alerts với severity (low/medium/high) | Cao |
| TC-AI-015 | Phát hiện giao dịch chi lớn bất thường | Thêm giao dịch 10x trung bình | Alert với severity = "high" | Cao |
| TC-AI-016 | Không có bất thường | Tất cả giao dịch trong mức bình thường | Mảng alerts rỗng hoặc chỉ có severity "low" | Trung bình |
| TC-AI-017 | Cảnh báo vượt ngân sách 80-99% | Chi tiêu = 90% budget | Alert mức "medium" | Cao |
| TC-AI-018 | Cảnh báo vượt ngân sách ≥ 100% | Chi tiêu = 120% budget | Alert mức "high" | Cao |

---

## 8. KIỂM THỬ MODULE CHATBOT (POST /api/v1/chatbot/chat)

| TC-ID | Mô tả | Dữ liệu đầu vào | Kết quả mong đợi | Mức độ |
|-------|--------|-------------------|-------------------|--------|
| TC-CHAT-001 | Hỏi về cách tiết kiệm | message: "Làm sao để tiết kiệm tiền hiệu quả?" | HTTP 200, câu trả lời liên quan đến tiết kiệm (quy tắc 50/30/20, mẹo tiết kiệm...) | Cao |
| TC-CHAT-002 | Hỏi về đầu tư cơ bản | message: "Tôi nên bắt đầu đầu tư như thế nào?" | HTTP 200, câu trả lời về đầu tư cơ bản | Cao |
| TC-CHAT-003 | Hỏi về quỹ khẩn cấp | message: "Quỹ khẩn cấp là gì?" | HTTP 200, giải thích về quỹ khẩn cấp | Trung bình |
| TC-CHAT-004 | Hỏi về chiến lược trả nợ | message: "Cách trả nợ hiệu quả?" | HTTP 200, câu trả lời về chiến lược trả nợ | Trung bình |
| TC-CHAT-005 | Gửi message rỗng | message: "" | HTTP 422 hoặc thông báo lỗi | Trung bình |
| TC-CHAT-006 | Hỏi ngoài lĩnh vực tài chính | message: "Thời tiết hôm nay thế nào?" | Câu trả lời lịch sự từ chối hoặc redirect về chủ đề tài chính | Thấp |
| TC-CHAT-007 | Kiểm tra thời gian phản hồi | Bất kỳ câu hỏi | Response time < 5 giây | Cao |
| TC-CHAT-008 | Kiểm tra fallback khi LLM không khả dụng | Ollama service không chạy | Chatbot vẫn trả lời bằng keyword-based responses | Cao |
| TC-CHAT-009 | Kiểm tra lưu lịch sử chat | Gửi nhiều messages | Lịch sử chat được lưu trong DB (bảng chat_history) | Trung bình |

---

## 9. KIỂM THỬ GIAO DIỆN NGƯỜI DÙNG (Frontend UI)

### 9.1 Trang Đăng nhập / Đăng ký

| TC-ID | Mô tả | Thao tác | Kết quả mong đợi | Mức độ |
|-------|--------|----------|-------------------|--------|
| TC-UI-001 | Hiển thị form đăng nhập | Truy cập trang Login | Form có trường email, password, nút "Đăng nhập" | Cao |
| TC-UI-002 | Chuyển sang form đăng ký | Click "Đăng ký" | Hiển thị form với trường email, password, name | Cao |
| TC-UI-003 | Đăng nhập thành công → chuyển trang | Nhập đúng email/password, click Đăng nhập | Chuyển sang trang Dashboard | Cao |
| TC-UI-004 | Đăng nhập thất bại → hiển thị lỗi | Nhập sai password | Hiển thị thông báo lỗi "Có lỗi xảy ra" | Cao |
| TC-UI-005 | Responsive trên mobile | Truy cập từ viewport 375px | Form hiển thị đúng, không bị cắt | Trung bình |

### 9.2 Trang Dashboard

| TC-ID | Mô tả | Thao tác | Kết quả mong đợi | Mức độ |
|-------|--------|----------|-------------------|--------|
| TC-UI-006 | Hiển thị 4 stat cards | Load trang Dashboard | Hiển thị: Tổng số dư, Thu nhập tháng, Chi tiêu tháng, Tỷ lệ tiết kiệm | Cao |
| TC-UI-007 | Biểu đồ tròn chi tiêu | Có dữ liệu giao dịch | Biểu đồ PieChart hiển thị phân bổ theo danh mục | Cao |
| TC-UI-008 | Danh sách giao dịch gần đây | Có giao dịch | Hiển thị danh sách giao dịch mới nhất | Trung bình |
| TC-UI-009 | Cảnh báo ngân sách | Có budget vượt ngưỡng | Hiển thị alert trên dashboard | Cao |
| TC-UI-010 | Dashboard empty state | User mới, chưa có dữ liệu | Hiển thị giao diện rỗng thân thiện, không lỗi | Trung bình |
| TC-UI-011 | Thời gian load trang | Đo load time | < 2 giây | Cao |

### 9.3 Trang Giao dịch

| TC-ID | Mô tả | Thao tác | Kết quả mong đợi | Mức độ |
|-------|--------|----------|-------------------|--------|
| TC-UI-012 | Hiển thị danh sách giao dịch | Load trang Transactions | Bảng hiển thị danh sách giao dịch | Cao |
| TC-UI-013 | Thêm giao dịch qua modal | Click nút thêm → điền form → submit | Modal mở, nhập dữ liệu, submit thành công, modal đóng, danh sách cập nhật | Cao |
| TC-UI-014 | AI phân loại khi thêm giao dịch | Click nút Sparkles ✨ bên cạnh category selector | AI đề xuất danh mục, user có thể chấp nhận hoặc chọn khác | Cao |
| TC-UI-015 | Filter giao dịch | Chọn filter theo account/category/type | Danh sách cập nhật theo bộ lọc | Trung bình |
| TC-UI-016 | Sửa giao dịch | Click sửa → điền lại → submit | Giao dịch cập nhật | Trung bình |
| TC-UI-017 | Xóa giao dịch | Click xóa → xác nhận | Giao dịch bị xóa, danh sách cập nhật | Trung bình |

### 9.4 Trang Ngân sách

| TC-ID | Mô tả | Thao tác | Kết quả mong đợi | Mức độ |
|-------|--------|----------|-------------------|--------|
| TC-UI-018 | Hiển thị budget cards | Load trang Budgets | Grid layout với các budget cards | Cao |
| TC-UI-019 | Progress bar trên budget card | Có chi tiêu trong danh mục | Progress bar hiển thị đúng % đã chi | Cao |
| TC-UI-020 | Thêm ngân sách | Click thêm → điền form | Ngân sách mới được tạo và hiển thị | Trung bình |
| TC-UI-021 | Highlight ngân sách vượt ngưỡng | Budget đã chi ≥ 80% | Card đổi màu hoặc hiển thị cảnh báo | Cao |

### 9.5 Trang Báo cáo

| TC-ID | Mô tả | Thao tác | Kết quả mong đợi | Mức độ |
|-------|--------|----------|-------------------|--------|
| TC-UI-022 | Biểu đồ cột thu chi | Load trang Reports | Bar chart hiển thị thu/chi theo tháng | Cao |
| TC-UI-023 | Biểu đồ dự đoán dòng tiền | Có đủ dữ liệu lịch sử | Line chart hiển thị dự đoán thu/chi tương lai | Cao |
| TC-UI-024 | Breakdown theo danh mục | Load trang Reports | Chi tiết chi tiêu theo từng danh mục | Trung bình |

### 9.6 Trang Chatbot

| TC-ID | Mô tả | Thao tác | Kết quả mong đợi | Mức độ |
|-------|--------|----------|-------------------|--------|
| TC-UI-025 | Giao diện chat | Load trang Chatbot | Hiển thị khung chat với message bubbles | Cao |
| TC-UI-026 | Gửi tin nhắn | Nhập tin nhắn → click gửi | Tin nhắn hiển thị trong chat, bot phản hồi | Cao |
| TC-UI-027 | Typing indicator | Sau khi gửi tin nhắn | Hiển thị indicator trong khi chờ bot trả lời | Trung bình |
| TC-UI-028 | Quick questions | Load trang Chatbot | Hiển thị gợi ý câu hỏi nhanh, click để gửi | Trung bình |

### 9.7 Responsive Design

| TC-ID | Mô tả | Thao tác | Kết quả mong đợi | Mức độ |
|-------|--------|----------|-------------------|--------|
| TC-UI-029 | Desktop (> 1024px) | Resize browser > 1024px | Full sidebar + content layout | Cao |
| TC-UI-030 | Tablet (768-1024px) | Resize browser 768-1024px | Sidebar thu gọn (collapsible) | Trung bình |
| TC-UI-031 | Mobile (< 768px) | Resize browser < 768px | Bottom navigation bar, layout stack dọc | Cao |

---

## 10. KIỂM THỬ PHI CHỨC NĂNG

### 10.1 Hiệu năng

| TC-ID | Mô tả | Điều kiện | Kết quả mong đợi | Mức độ |
|-------|--------|-----------|-------------------|--------|
| TC-NF-001 | API response time | 95% requests | < 500ms | Cao |
| TC-NF-002 | Dashboard load time | Trang Dashboard | < 2 giây | Cao |
| TC-NF-003 | AI categorization time | POST /ai/categorize | < 200ms | Cao |
| TC-NF-004 | Concurrent users | 50+ requests đồng thời | Hệ thống xử lý không lỗi | Trung bình |

### 10.2 Bảo mật

| TC-ID | Mô tả | Điều kiện | Kết quả mong đợi | Mức độ |
|-------|--------|-----------|-------------------|--------|
| TC-NF-005 | Password hash bcrypt | Kiểm tra DB | password_hash bắt đầu bằng "$2b$", cost factor 12 | Cao |
| TC-NF-006 | JWT expiration | Token tạo > 7 ngày trước | API trả về 401 Unauthorized | Cao |
| TC-NF-007 | Data isolation | User A truy cập dữ liệu user B | Không trả về dữ liệu, HTTP 404/403 | Cao |
| TC-NF-008 | SQL Injection | Nhập `'; DROP TABLE users; --` vào trường | Hệ thống không bị ảnh hưởng (SQLAlchemy parameterized) | Cao |
| TC-NF-009 | XSS Attack | Nhập `<script>alert('xss')</script>` vào mô tả | Script không thực thi, hiển thị dưới dạng text | Cao |
| TC-NF-010 | API truy cập không có auth | GET /accounts/ không có token | HTTP 401 hoặc 403 | Cao |

### 10.3 Deployment

| TC-ID | Mô tả | Điều kiện | Kết quả mong đợi | Mức độ |
|-------|--------|-----------|-------------------|--------|
| TC-NF-011 | Docker Compose build | docker-compose build | Build thành công, không có lỗi | Cao |
| TC-NF-012 | Docker Compose up | docker-compose up -d | 4 services chạy: postgres, redis, backend, frontend | Cao |
| TC-NF-013 | Healthcheck | Sau khi docker-compose up | Tất cả services healthy | Cao |
| TC-NF-014 | Database migration | Khởi động lần đầu | Tất cả bảng được tạo tự động | Trung bình |

---

## 11. KIỂM THỬ TÍCH HỢP END-TO-END

### Kịch bản 1: Người dùng mới sử dụng đầy đủ tính năng

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|-------------------|
| 1 | Đăng ký tài khoản mới | Tạo thành công, chuyển sang đăng nhập |
| 2 | Đăng nhập | Dashboard hiển thị (empty state) |
| 3 | Tạo 2 tài khoản: "Ví tiền mặt" (1M) và "Ngân hàng" (5M) | 2 accounts hiển thị, tổng = 6M |
| 4 | Khởi tạo danh mục mặc định | Danh sách categories hệ thống được tạo |
| 5 | Thêm 3 giao dịch chi và 2 giao dịch thu | Giao dịch hiển thị, balance cập nhật |
| 6 | Tạo 2 ngân sách (Ăn uống 1M, Di chuyển 500K) | Budget cards hiển thị với progress |
| 7 | Xem Dashboard | Stat cards, biểu đồ, giao dịch gần đây hiển thị đúng |
| 8 | Xem Reports | Báo cáo tháng với breakdown |
| 9 | Dùng AI phân loại 1 giao dịch mới | AI đề xuất đúng danh mục |
| 10 | Chat với chatbot "Cách tiết kiệm tiền?" | Bot trả lời hữu ích |

### Kịch bản 2: Kiểm tra luồng cảnh báo ngân sách

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|-------------------|
| 1 | Đăng nhập, tạo budget "Ăn uống" = 1,000,000 VND/tháng | Budget created |
| 2 | Thêm chi tiêu ăn uống = 800,000 VND | Budget progress = 80%, cảnh báo medium |
| 3 | Xem Dashboard | Alert hiển thị "Ăn uống đạt 80%" |
| 4 | Thêm chi tiêu ăn uống = 300,000 VND | Budget progress = 110%, cảnh báo high |
| 5 | Xem Dashboard | Alert nghiêm trọng "Ăn uống vượt 110%" |

### Kịch bản 3: Kiểm tra luồng AI hoàn chỉnh

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|-------------------|
| 1 | Tạo 15+ giao dịch với danh mục đa dạng | Giao dịch được tạo thành công |
| 2 | Train classifier | Training thành công, trả về accuracy |
| 3 | Test phân loại: "Cà phê sáng" | Đề xuất "Ăn uống" |
| 4 | Test phân loại: "Uber đi làm" | Đề xuất "Di chuyển" |
| 5 | Xem dự đoán dòng tiền | Dự đoán thu/chi 1-3 tháng tới |
| 6 | Thêm giao dịch bất thường (10x trung bình) | Alert bất thường xuất hiện |

---

## 12. TỔNG HỢP SỐ LƯỢNG TEST CASES

| Module | Số test cases |
|--------|---------------|
| Authentication | 17 |
| Accounts | 10 |
| Categories | 7 |
| Transactions | 19 |
| Budgets | 8 |
| Dashboard & Reports | 12 |
| AI Services | 18 |
| Chatbot | 9 |
| Frontend UI | 31 |
| Phi chức năng | 14 |
| End-to-End | 3 kịch bản |
| **Tổng cộng** | **148 test cases + 3 kịch bản E2E** |
