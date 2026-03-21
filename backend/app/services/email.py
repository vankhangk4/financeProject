import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """Gửi email cảnh báo."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[EMAIL DISABLED] Would send to {to_email}: {subject}")
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = settings.EMAILS_FROM
        msg['To'] = to_email

        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        print(f"[EMAIL SENT] to {to_email}: {subject}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False


def send_activity_email(
    to_email: str,
    user_name: str,
    subject: str,
    action: str,
    details: list,
) -> bool:
    """Gửi email thông báo hoạt động (CRUD ngân sách, giao dịch)."""
    details_html = ""
    for label, value in details:
        details_html += f"<tr><td style='padding: 8px 0; color: #6b7280;'>{label}</td><td style='padding: 8px 0; text-align: right; font-weight: bold;'>{value}</td></tr>"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background-color: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; }}
            .detail-box {{ background-color: white; border: 1px solid #e5e7eb; padding: 15px; margin: 15px 0; border-radius: 8px; }}
            .action-badge {{ display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; color: white; background-color: #4f46e5; }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h2>FinanceManager</h2>
            <p>{subject}</p>
        </div>
        <div class="content">
            <p>Xin chào <strong>{user_name}</strong>,</p>
            <p><span class="action-badge">{action}</span></p>
            <div class="detail-box">
                <table style="width: 100%;">
                    {details_html}
                </table>
            </div>
            <p>Truy cập <a href="http://localhost:3000">FinanceManager</a> để xem chi tiết.</p>
        </div>
        <div class="footer">
            <p>Email này được gửi tự động từ hệ thống FinanceManager.</p>
            <p>© 2026 FinanceManager - Hệ thống Quản lý Tài chính Cá nhân Thông minh</p>
        </div>
    </body>
    </html>
    """

    return send_email(to_email, subject, html_content)


def send_budget_alert_email(
    user_email: str,
    user_name: str,
    category_name: str,
    budget_amount: float,
    spent_amount: float,
    percentage: float,
) -> bool:
    """Gửi email cảnh báo khi vượt ngân sách."""
    subject = f"Cảnh báo: Chi tiêu cho '{category_name}' đã vượt ngân sách!"

    formatted_budget = f"{budget_amount:,.0f}".replace(",", ".")
    formatted_spent = f"{spent_amount:,.0f}".replace(",", ".")
    formatted_over = f"{spent_amount - budget_amount:,.0f}".replace(",", ".")

    if percentage >= 100:
        color = "#ef4444"
        severity = "NGHIÊM TRỌNG"
        message = "bạn đã vượt quá ngân sách"
    elif percentage >= 90:
        color = "#f97316"
        severity = "CẢNH BÁO CAO"
        message = "chi tiêu của bạn đã gần đạt ngưỡng"
    else:
        color = "#eab308"
        severity = "CẢNH BÁO"
        message = "chi tiêu của bạn đã đạt"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: {color}; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background-color: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; }}
            .alert-box {{ background-color: white; border-left: 4px solid {color}; padding: 15px; margin: 15px 0; border-radius: 5px; }}
            .progress-bar {{ background-color: #e5e7eb; border-radius: 10px; height: 20px; overflow: hidden; margin: 10px 0; }}
            .progress-fill {{ background-color: {color}; height: 100%; border-radius: 10px; }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }}
            .highlight {{ font-weight: bold; color: {color}; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h2>⚠️ {severity}</h2>
            <p>Chi tiêu vượt ngân sách</p>
        </div>
        <div class="content">
            <p>Xin chào <strong>{user_name}</strong>,</p>

            <div class="alert-box">
                <p><strong>Danh mục:</strong> {category_name}</p>
                <p>{message} <span class="highlight">{percentage:.1f}%</span> ngân sách.</p>
            </div>

            <h3>Chi tiết ngân sách</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0;">Ngân sách:</td>
                    <td style="text-align: right; font-weight: bold;">{formatted_budget} VND</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;">Đã chi:</td>
                    <td style="text-align: right; font-weight: bold; color: {color};">{formatted_spent} VND</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;">Vượt quá:</td>
                    <td style="text-align: right; font-weight: bold; color: {color};">{formatted_over} VND</td>
                </tr>
            </table>

            <div class="progress-bar">
                <div class="progress-fill" style="width: {min(percentage, 100):.1f}%;"></div>
            </div>
            <p style="text-align: center; font-size: 12px; color: #6b7280;">{percentage:.1f}% đã sử dụng</p>

            <h3>Mẹo quản lý chi tiêu</h3>
            <ul>
                <li>Xem xét giảm chi tiêu cho danh mục này trong tháng</li>
                <li>Lên kế hoạch mua sắm trước khi chi tiêu</li>
                <li>Theo dõi chi tiêu hàng ngày để kiểm soát tốt hơn</li>
            </ul>

            <p>Truy cập <a href="http://localhost:3000/budgets">FinanceManager</a> để xem chi tiết.</p>
        </div>
        <div class="footer">
            <p>Email này được gửi tự động từ hệ thống FinanceManager.</p>
            <p>© 2026 FinanceManager - Hệ thống Quản lý Tài chính Cá nhân Thông minh</p>
        </div>
    </body>
    </html>
    """

    return send_email(user_email, subject, html_content)
