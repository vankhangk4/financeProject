import { useState, useRef, useEffect } from 'react';
import { api } from '@/services/api';
import { ChatMessage } from '@/types';
import { Send, Bot, User } from 'lucide-react';
import { useI18n } from '@/i18n';

export default function Chatbot() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'bot',
      content: t('chatbot_welcome_title') + t('chatbot_welcome_bullets'),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const result = await api.chat(userMsg.content) as { response: string };
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: result.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: t('Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn. Vui lòng thử lại.'),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    t('Làm sao để tiết kiệm hiệu quả?'),
    t('Quỹ khẩn cấp nên có bao nhiêu?'),
    t('Mẹo quản lý chi tiêu hàng tháng?'),
    t('Đầu tư gì cho người mới bắt đầu?'),
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] sm:h-[calc(100vh-8rem)]">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 animate-fade-in-up">{t('Trợ lý Tài chính')}</h1>

      <div className="flex-1 bg-white rounded-xl shadow-sm flex flex-col overflow-hidden card-hover animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={`flex gap-2 sm:gap-3 animate-fade-in-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${
                msg.role === 'user' ? 'bg-primary-100 text-primary-600' : 'bg-green-100 text-green-600'
              }`}>
                {msg.role === 'user' ? <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </div>
              <div className={`max-w-[75%] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 transition-all duration-200 ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-tr-sm'
                  : 'bg-gray-100 text-gray-800 rounded-tl-sm'
              }`}>
                <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                <div className={`text-[10px] sm:text-xs mt-1 ${
                  msg.role === 'user' ? 'text-primary-200 text-right' : 'text-gray-400'
                }`}>
                  {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 sm:gap-3 animate-fade-in">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick questions */}
        {messages.length === 1 && (
          <div className="px-3 sm:px-4 pb-2 sm:pb-3 animate-fade-in">
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {quickQuestions.map((q, i) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-gray-50 hover:bg-primary-50 hover:text-primary-700 text-gray-600 rounded-full border border-gray-200 hover:border-primary-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-3 sm:p-4 border-t border-gray-200">
          <div className="flex gap-2 sm:gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t('Hỏi về tài chính cá nhân...')}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm transition-all"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="bg-primary-600 text-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.05] active:scale-[0.95]"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
