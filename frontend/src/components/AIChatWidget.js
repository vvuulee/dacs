import React, { useState, useEffect, useRef } from 'react';
import { chatWithAI } from '../services/api';

const QUICK_PROMPTS = [
  '🎮 Tư vấn laptop gaming tốt nhất',
  '💼 Laptop văn phòng mỏng nhẹ, pin trâu',
  '🍏 Có MacBook nào đang sẵn hàng?',
  '📦 Cho mình xem danh sách laptop trong kho',
];

const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Khởi tạo tin nhắn từ sessionStorage hoặc tin nhắn chào mừng mặc định
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ai_chat_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [
      {
        sender: 'ai',
        text: 'Xin chào! 👋 Mình là **Trợ lý AI của LAPTOP.HAY**.\nBạn đang tìm kiếm dòng laptop nào (Gaming, đồ họa, văn phòng hay MacBook...) hay cần tư vấn mức giá khoảng bao nhiêu để mình hỗ trợ ngay nhé?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const messagesEndRef = useRef(null);

  // Tự động cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading]);

  // Lưu lịch sử chat vào sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('ai_chat_history', JSON.stringify(messages));
    } catch (e) {
      // ignore
    }
  }, [messages]);

  // Gửi tin nhắn
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Thêm tin nhắn của User
    const newMessages = [
      ...messages,
      { sender: 'user', text, time: currentTime },
    ];
    setMessages(newMessages);
    setInputMessage('');
    setLoading(true);

    try {
      const data = await chatWithAI(text);
      const replyText = data?.reply || 'Cảm ơn bạn! Hiện tại mình đang cập nhật dữ liệu máy mới, bạn có thể nhắn Zalo để nhân viên tư vấn nhanh nhất nhé!';

      setMessages([
        ...newMessages,
        {
          sender: 'ai',
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error('Lỗi khi chat với AI:', err);
      setMessages([
        ...newMessages,
        {
          sender: 'ai',
          text: 'Rất tiếc, kết nối đến Trợ lý AI đang tạm thời gián đoạn. Bạn vui lòng nhắn tin trực tiếp qua nút **Zalo** bên dưới để nhân viên cửa hàng hỗ trợ ngay nhé!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Làm mới cuộc trò chuyện
  const handleResetChat = () => {
    if (window.confirm('Bạn có muốn làm mới cuộc trò chuyện với Trợ lý AI không?')) {
      const initial = [
        {
          sender: 'ai',
          text: 'Xin chào! 👋 Mình là **Trợ lý AI của LAPTOP.HAY**.\nBạn đang tìm kiếm dòng laptop nào hoặc cần tư vấn mức giá khoảng bao nhiêu?',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
      setMessages(initial);
      sessionStorage.removeItem('ai_chat_history');
    }
  };

  // Helper render text có format bold và xuống dòng
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;
    const lines = rawText.split('\n');

    return lines.map((line, idx) => {
      // Biến đổi **text** thành in đậm
      const parts = line.split(/(\*\*.*?\*\*)/g);

      return (
        <p key={idx} className={line.trim() === '' ? 'h-2' : 'min-h-[1.25rem]'}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-extrabold text-inherit">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <>
      {/* Cửa sổ Chat Box AI */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-[420px] h-[550px] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header Chat Box */}
          <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-gray-900 text-white p-4 flex items-center justify-between shadow-md select-none">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl shadow-inner">
                  🤖
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-purple-800 rounded-full animate-pulse"></span>
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5 leading-tight">
                  <span>Trợ Lý AI LAPTOP.HAY</span>
                  <span className="bg-purple-500/40 text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider">
                    AI Bot
                  </span>
                </h3>
                <p className="text-[11px] text-purple-200 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                  Sẵn sàng tư vấn theo kho thực tế 24/7
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Nút reset */}
              <button
                type="button"
                onClick={handleResetChat}
                className="w-8 h-8 rounded-xl text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center transition text-xs"
                title="Làm mới cuộc trò chuyện"
              >
                🔄
              </button>
              {/* Nút đóng */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-xl text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center transition text-sm font-bold"
                title="Thu nhỏ cửa sổ chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body tin nhắn */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-gray-50/70 to-white text-xs sm:text-[13px] leading-relaxed">
            {messages.map((msg, index) => {
              const isAi = msg.sender === 'ai';

              return (
                <div
                  key={index}
                  className={`flex gap-2.5 ${isAi ? 'justify-start' : 'justify-end'}`}
                >
                  {isAi && (
                    <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 shrink-0 flex items-center justify-center text-xs font-bold shadow-xs mt-1">
                      🤖
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs space-y-1 ${
                      isAi
                        ? 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-sm shadow-purple-500/10'
                    }`}
                  >
                    <div className="break-words">
                      {renderFormattedText(msg.text)}
                    </div>
                    <div
                      className={`text-[10px] text-right pt-0.5 ${
                        isAi ? 'text-gray-400' : 'text-purple-200'
                      }`}
                    >
                      {msg.time}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Hiệu ứng AI đang suy nghĩ / gõ tin nhắn */}
            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 shrink-0 flex items-center justify-center text-xs font-bold shadow-xs mt-1">
                  🤖
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[11px] text-gray-400 ml-1.5 font-medium">
                    AI đang tra cứu kho máy...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Gợi ý câu hỏi nhanh (Quick Prompts) */}
          <div className="px-3 py-2 bg-gray-50/80 border-t border-gray-100 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 font-semibold shrink-0 uppercase tracking-wider pl-1">
              Gợi ý:
            </span>
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                disabled={loading}
                onClick={() => handleSendMessage(prompt)}
                className="text-[11px] font-medium bg-white hover:bg-purple-50 text-gray-700 hover:text-purple-700 px-2.5 py-1 rounded-full border border-gray-200 hover:border-purple-200 transition shrink-0 shadow-2xs disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-gray-100">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder="Hỏi AI về laptop, cấu hình, mức giá..."
                className="flex-1 bg-gray-50 border border-gray-200 focus:border-purple-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-brand-dark outline-none transition"
              />
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 text-white w-10 h-10 rounded-xl flex items-center justify-center transition shadow-sm shrink-0"
                title="Gửi tin nhắn"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 rotate-90"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
            <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-gray-400">
              <span>Hỗ trợ tư vấn theo kho máy thật</span>
              <a
                href="https://zalo.me/0862618682"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-semibold flex items-center gap-0.5"
              >
                <span>Cần nhân viên hỗ trợ?</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Nút tròn nổi Chat với AI (Đặt ngay phía trên nút Zalo) */}
      <div className="fixed bottom-24 right-6 z-50 flex items-center group">
        {/* Khung tooltip gợi ý khi rê chuột vào */}
        <div className="absolute right-16 bg-brand-dark text-white px-3.5 py-2 rounded-2xl shadow-xl text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-white/10">
          {isOpen ? 'Thu nhỏ cửa sổ Chat AI' : '🤖 Chat với Trợ lý AI tư vấn Laptop!'}
        </div>

        {/* Nút bấm tròn nổi bật với Gradient Tím - Xanh công nghệ */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          title="Chat với Trợ lý AI tư vấn"
          className="w-14 h-14 bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-500 hover:from-purple-800 hover:to-indigo-700 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 relative border-2 border-white/30"
        >
          {/* Hiệu ứng vòng sóng lan tỏa (Pulse Ping Animation) */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full bg-purple-500 opacity-60 animate-ping pointer-events-none"></span>
          )}

          {isOpen ? (
            <span className="text-xl font-bold relative z-10">✕</span>
          ) : (
            <span className="text-2xl relative z-10">🤖</span>
          )}
        </button>
      </div>
    </>
  );
};

export default AIChatWidget;

