import React from 'react';

const Banner = () => {
  const scrollToProducts = () => {
    const el = document.getElementById('product-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-7xl mt-6">
      <div className="bg-brand-dark text-white rounded-3xl overflow-hidden shadow-xl relative min-h-[340px] md:min-h-[380px] flex items-center">
        {/* Nền gradient tinh tế phía sau */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-brand-dark/95 to-transparent z-10" />

        {/* Cột chữ bên trái */}
        <div className="relative z-20 p-8 sm:p-12 md:p-14 max-w-xl flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping"></span>
            <span className="text-yellow-400 font-bold tracking-widest text-xs uppercase">
              Bộ sưu tập cao cấp 2026
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 leading-tight tracking-tight text-white drop-shadow-sm">
            Sức mạnh vượt trội <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-500">
              Đẳng cấp dẫn đầu
            </span>
          </h1>

          <p className="text-gray-300 text-sm sm:text-base font-medium mb-6 leading-relaxed max-w-md">
            Trải nghiệm các dòng Laptop Gaming đỉnh cao, MacBook sang trọng và Ultrabook mỏng nhẹ với hiệu năng vượt giới hạn.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={scrollToProducts}
              className="bg-gradient-to-r from-yellow-500 to-amber-400 text-brand-dark px-7 py-3.5 rounded-xl font-extrabold text-sm hover:from-yellow-400 hover:to-amber-300 transition duration-300 shadow-lg hover:shadow-yellow-500/20 hover:scale-105 transform active:scale-95 flex items-center gap-2"
            >
              <span>Khám phá ngay</span>
              <span>↓</span>
            </button>

            <span className="text-[#FFD700] text-xs sm:text-sm font-semibold italic drop-shadow-sm">
              ★ "Chất lượng tạo nên uy tín"
            </span>
          </div>
        </div>

        {/* Ảnh Laptop bên phải */}
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-3/5 h-full z-0">
          <img
            src="https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=2070&auto=format&fit=crop"
            alt="Banner Laptop"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-brand-dark via-brand-dark/80 to-transparent" />
        </div>
      </div>
    </div>
  );
};

export default Banner;