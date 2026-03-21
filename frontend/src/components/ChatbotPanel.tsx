import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { ChatMessage, ChatSession, ChatSessionDetail } from '@/types';
import { useI18n } from '@/i18n';
import {
  X,
  Bot,
  User,
  Send,
  History,
  Plus,
  Trash2,
  ChevronLeft,
  Clock,
} from 'lucide-react';
import clsx from 'clsx';

interface ChatbotPanelProps {
  onOpen?: () => void;
  onClose?: () => void;
}

export default function ChatbotPanel({ onOpen, onClose }: ChatbotPanelProps) {
  const { t, lang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Close panel on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
    loadSessions();
  }, [onOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setShowHistory(false);
    onClose?.();
  }, [onClose]);

  const loadSessions = async () => {
    try {
      const data = await api.getChatSessions() as ChatSession[];
      setSessions(data);
    } catch {
      // Silently fail
    }
  };

  const loadSession = async (sessionId: number) => {
    setInitialLoading(true);
    setCurrentSessionId(sessionId);
    setShowHistory(false);
    try {
      const data = await api.getChatSession(sessionId) as ChatSessionDetail;
      const loaded: ChatMessage[] = [];
      data.messages.forEach((msg) => {
        loaded.push({
          id: `msg-${msg.id}-user`,
          role: 'user',
          content: msg.message,
          timestamp: new Date(msg.created_at),
        });
        loaded.push({
          id: `msg-${msg.id}-bot`,
          role: 'bot',
          content: msg.response,
          timestamp: new Date(msg.created_at),
        });
      });
      setMessages(loaded.length > 0 ? loaded : getWelcomeMessage());
    } catch {
      setMessages(getWelcomeMessage());
    } finally {
      setInitialLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      const session = await api.createChatSession() as ChatSession;
      setCurrentSessionId(session.id);
      setSessions((prev) => [session, ...prev]);
      setMessages(getWelcomeMessage());
      setShowHistory(false);
    } catch {
      // Silently fail
    }
  };

  const deleteSession = async (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation();
    try {
      await api.deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages(getWelcomeMessage());
      }
    } catch {
      // Silently fail
    }
  };

  const getWelcomeMessage = (): ChatMessage[] => [
    {
      id: 'welcome',
      role: 'bot',
      content:
        t('chatbot_welcome_title') + t('chatbot_welcome_bullets'),
      timestamp: new Date(),
    },
  ];

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}-user`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    const sentText = input.trim();
    setInput('');
    setLoading(true);

    try {
      const result = await api.chat(sentText, currentSessionId ?? undefined) as {
        response: string;
        session_id?: number;
      };

      // If server returned a new session_id, use it
      if (result.session_id && result.session_id !== currentSessionId) {
        setCurrentSessionId(result.session_id);
        // Refresh sessions list
        loadSessions();
      }

      const botMsg: ChatMessage = {
        id: `temp-${Date.now()}-bot`,
        role: 'bot',
        content: result.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `temp-${Date.now()}-error`,
        role: 'bot',
        content: t('Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn. Vui lòng thử lại.'),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const quickQuestions = [
    t('Làm sao để tiết kiệm hiệu quả?'),
    t('Quỹ khẩn cấp nên có bao nhiêu?'),
    t('Mẹo quản lý chi tiêu hàng tháng?'),
    t('Đầu tư gì cho người mới bắt đầu?'),
  ];

  // Detect action keywords from bot response
  const lastBotMessage = messages.filter((m) => m.role === 'bot').pop();
  const detectAction = (content: string): { type: string; label: string } | null => {
    const lower = content.toLowerCase();
    if (lower.includes('ngân sách') || lower.includes('budget') || lower.includes('tạo ngân sách')) {
      return { type: 'budget', label: t('Tạo ngân sách') };
    }
    if (lower.includes('giao dịch') || lower.includes('thêm chi tiêu') || lower.includes('thêm thu nhập')) {
      return { type: 'transaction', label: t('Thêm giao dịch') };
    }
    if (lower.includes('báo cáo') || lower.includes('report')) {
      return { type: 'report', label: t('Xem báo cáo') };
    }
    if (lower.includes('số dư') || lower.includes('tài khoản') || lower.includes('kiểm tra')) {
      return { type: 'dashboard', label: t('Tổng quan') };
    }
    return null;
  };

  const action = lastBotMessage ? detectAction(lastBotMessage.content) : null;

  const handleAction = (type: string) => {
    handleClose();
    if (type === 'budget') {
      window.location.href = '/budgets';
    } else if (type === 'transaction') {
      window.location.href = '/transactions';
    } else if (type === 'report') {
      window.location.href = '/reports';
    } else if (type === 'dashboard') {
      window.location.href = '/dashboard';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return lang === 'vi' ? 'Hôm nay' : 'Today';
    if (days === 1) return lang === 'vi' ? 'Hôm qua' : 'Yesterday';
    if (days < 7) return `${days} ${lang === 'vi' ? 'ngày trước' : 'days ago'}`;
    return date.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={isOpen ? handleClose : handleOpen}
        className={clsx(
          'fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full shadow-lg',
          'bg-primary-600 hover:bg-primary-700 text-white',
          'flex items-center justify-center transition-all duration-300',
          'hover:scale-110 active:scale-95',
          'flex items-center justify-center'
        )}
        title={isOpen ? t('Đóng') : t('Trợ lý Tài chính')}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Bot className="w-7 h-7" />
        )}
      </button>

      {/* Panel */}
      <div
        ref={panelRef}
        className={clsx(
          'fixed top-0 right-0 z-[60] h-full w-[400px] max-w-[100vw]',
          'bg-white shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-in-out'
        )}
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
          <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 text-sm truncate">
              {t('Trợ lý Tài chính')}
            </h2>
            {currentSessionId && (
              <p className="text-xs text-gray-500 truncate">
                {sessions.find((s) => s.id === currentSessionId)?.title || ''}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              showHistory
                ? 'bg-primary-100 text-primary-600'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            )}
            title={t('Lịch sử chat')}
          >
            <History className="w-5 h-5" />
          </button>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={t('Đóng')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <button
                onClick={() => setShowHistory(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {t('Lịch sử chat')}
              </span>
              <button
                onClick={createNewSession}
                className="ml-auto p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title={t('Phiên mới')}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
                  <Clock className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">
                    {lang === 'vi' ? 'Chưa có phiên chat nào' : 'No chat sessions yet'}
                  </p>
                  <button
                    onClick={createNewSession}
                    className="mt-3 px-4 py-2 text-sm bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    {t('Bắt đầu cuộc trò chuyện mới')}
                  </button>
                </div>
              ) : (
                <div className="py-1">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => loadSession(session.id)}
                      className={clsx(
                        'flex items-center gap-2 px-4 py-3 cursor-pointer transition-colors',
                        'hover:bg-gray-50',
                        currentSessionId === session.id ? 'bg-primary-50' : ''
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={clsx(
                          'text-sm font-medium truncate',
                          currentSessionId === session.id ? 'text-primary-700' : 'text-gray-800'
                        )}>
                          {session.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(session.updated_at)} · {session.message_count} {lang === 'vi' ? 'tin' : 'msgs'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteSession(e, session.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title={t('Xóa')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Area */}
        {!showHistory && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {initialLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={clsx(
                        'flex gap-2',
                        msg.role === 'user' ? 'flex-row-reverse' : ''
                      )}
                    >
                      <div
                        className={clsx(
                          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                          msg.role === 'user'
                            ? 'bg-primary-600 text-white'
                            : 'bg-primary-100 text-primary-600'
                        )}
                      >
                        {msg.role === 'user' ? (
                          <User className="w-3.5 h-3.5" />
                        ) : (
                          <Bot className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div
                        className={clsx(
                          'max-w-[80%] rounded-2xl px-3 py-2.5',
                          'transition-all duration-200',
                          msg.role === 'user'
                            ? 'bg-primary-600 text-white rounded-tr-sm'
                            : 'bg-white text-gray-800 rounded-tl-sm shadow-sm'
                        )}
                      >
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </div>
                        <div
                          className={clsx(
                            'text-[10px] mt-1',
                            msg.role === 'user' ? 'text-primary-200 text-right' : 'text-gray-400'
                          )}
                        >
                          {msg.timestamp.toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Action Buttons */}
                  {action && messages.length > 1 && !loading && (
                    <div className="flex justify-start pl-9">
                      <button
                        onClick={() => handleAction(action.type)}
                        className={clsx(
                          'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                          'bg-primary-600 text-white hover:bg-primary-700',
                          'hover:scale-[1.02] active:scale-[0.98] shadow-sm'
                        )}
                      >
                        {action.label}
                      </button>
                    </div>
                  )}

                  {loading && (
                    <div className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                        <div className="flex gap-1">
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          />
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          />
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Quick Suggestions */}
            {messages.length === 1 && (
              <div className="px-4 pb-2 bg-gray-50">
                <div className="flex flex-wrap gap-1.5">
                  {quickQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSuggestionClick(q)}
                      className={clsx(
                        'px-3 py-1.5 text-xs bg-white text-gray-600 rounded-full',
                        'border border-gray-200 hover:border-primary-300',
                        'hover:bg-primary-50 hover:text-primary-700',
                        'transition-all duration-200'
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={t('Hỏi về tài chính cá nhân...')}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm transition-all"
                  disabled={loading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className={clsx(
                    'p-2.5 rounded-xl transition-all duration-200',
                    'hover:scale-105 active:scale-95',
                    input.trim() && !loading
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[55] sm:hidden"
          onClick={handleClose}
        />
      )}
    </>
  );
}
