import React from 'react';

const ZaloChatWidget = () => {
  // Thay số điện thoại Zalo của bạn vào đây (định dạng quốc gia, ví dụ: 84912345678)
  // Hoặc điền trực tiếp link Zalo OA / Zalo cá nhân của bạn
  const zaloNumber = '0862618682'; 
  const zaloUrl = `https://zalo.me/${zaloNumber}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center group">
      {/* Khung chữ gợi ý hiển thị khi rê chuột vào (Tooltip) */}
      <div className="absolute right-16 bg-white text-brand-dark px-3.5 py-2 rounded-2xl shadow-lg border border-gray-100 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap">
        Chat với nhân viên hỗ trợ!
      </div>

      {/* Nút ô tròn Zalo */}
      <a
        href={zaloUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Liên hệ Zalo hỗ trợ"
        className="w-14 h-14 bg-[#0068FF] hover:bg-[#0052cc] text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all duration-300 relative"
      >
        {/* Hiệu ứng vòng sóng lan tỏa phía sau (Pulse Animation) */}
        <span className="absolute inset-0 rounded-full bg-[#0068FF] opacity-75 animate-ping pointer-events-none"></span>

        {/* Biểu tượng chữ Z (Zalo icon SVG) */}
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-8 h-8 fill-current relative z-10" 
          viewBox="0 0 48 48"
        >
          <path d="M24 4C12.95 4 4 12.95 4 24c0 4.28 1.35 8.25 3.65 11.5L5.5 41.5l6.35-2.05C15.1 41.5 19.35 43 24 43c11.05 0 20-8.95 20-20S35.05 4 24 4zm-2.75 25.5h-3.5V17.5h3.5v12zm10.5 0h-3.5v-6.25l-3-6.25h3.75l1.25 3.25 1.25-3.25h3.75l-3 6.25v6.25z"/>
        </svg>
      </a>
    </div>
  );
};

export default ZaloChatWidget;