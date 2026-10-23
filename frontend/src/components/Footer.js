import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-brand-dark text-white pt-12 pb-8 mt-16 border-t-[6px] border-brand-beige">
      <div className="container mx-auto px-4 max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Cột 1: Thông tin thương hiệu */}
        <div className="md:col-span-2">
          <h3 className="text-2xl font-bold mb-4 text-brand-beige tracking-wider">LAPTOP.HAY</h3>
          <p className="text-gray-400 mb-4 pr-4">
            "Chất lượng tạo nên uy tín" - Điểm đến tin cậy cho những người yêu công nghệ, 
            cung cấp các dòng laptop cao cấp, hiệu năng mạnh mẽ với dịch vụ hậu mãi hàng đầu.
          </p>
        </div>

        {/* Cột 2: Thông tin liên hệ */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-white">Liên hệ</h3>
          <ul className="text-gray-400 space-y-3 font-medium">
            <li>📍 123 Đường Công Nghệ, Cầu Giấy, Hà Nội</li>
            <li>📞 Hotline: 0123.456.789</li>
            <li>✉️ Email: contact@laptopstore.com</li>
          </ul>
        </div>

        {/* Cột 3: Chính sách hỗ trợ */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-white">Hỗ trợ khách hàng</h3>
          <ul className="text-gray-400 space-y-3 font-medium">
            <li className="hover:text-brand-beige cursor-pointer transition">Chính sách bảo hành</li>
            <li className="hover:text-brand-beige cursor-pointer transition">Chính sách đổi trả</li>
            <li className="hover:text-brand-beige cursor-pointer transition">Giao hàng & Thanh toán</li>
          </ul>
        </div>

      </div>

      {/* Dòng bản quyền */}
      <div className="container mx-auto px-4 max-w-7xl text-center text-gray-500 mt-10 pt-6 border-t border-gray-700 text-sm">
        © 2026 LAPTOPHAY. Đồ án thiết kế và phát triển.
      </div>
    </footer>
  );
};

export default Footer;