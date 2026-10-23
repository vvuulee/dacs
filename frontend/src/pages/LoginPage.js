import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:8080/api/auth/login",
        formData
      );

      // Lấy dữ liệu trả về từ Backend (hỗ trợ cả trường hợp trả về chuỗi Token hoặc Object JSON)
      const data = response.data;
      const token = typeof data === "string" ? data : data.token || data.accessToken;

      if (token) {
        // 1. Lưu thẻ Token vào bộ nhớ trình duyệt
        localStorage.setItem("token", token);

        // 2. Lưu thêm thông tin User/Role (nếu Backend trả về kèm trong JSON)
        if (typeof data === "object") {
          localStorage.setItem("user", JSON.stringify(data));
        }

        // Chuyển luôn về trang chủ và cập nhật trạng thái Header
        window.location.href = "/";
      } else {
        setError("Không nhận được Token từ hệ thống!");
      }
    } catch (err) {
      console.error("Lỗi đăng nhập:", err);
      const resData = err.response?.data;
      if (typeof resData === "string") {
        setError(resData);
      } else if (resData?.message === "Bad credentials") {
        setError("Sai tên đăng nhập hoặc mật khẩu. Vui lòng thử lại!");
      } else {
        setError(resData?.message || "Sai tài khoản hoặc mật khẩu. Vui lòng thử lại!");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#FAF8F5] border border-[#E5E0D8] rounded-2xl shadow-xl p-8">
        {/* Tiêu đề */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-[#1C1B18] tracking-tight">
            Chào mừng trở lại
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Đăng nhập vào hệ thống Laptop Store
          </p>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Form Đăng nhập */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#1C1B18] mb-1">
              Tên đăng nhập (hoặc Email)
            </label>
            <input
              type="text"
              name="username"
              required
              value={formData.username}
              onChange={handleChange}
              placeholder="Nhập tên đăng nhập..."
              className="w-full px-4 py-3 rounded-xl border border-[#D8D2C7] bg-white text-[#1C1B18] focus:outline-none focus:ring-2 focus:ring-[#1C1B18] transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C1B18] mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-[#D8D2C7] bg-white text-[#1C1B18] focus:outline-none focus:ring-2 focus:ring-[#1C1B18] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#1C1B18] text-[#F5F2EB] font-semibold rounded-xl hover:bg-gray-800 transition duration-200 shadow-md disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "Đăng Nhập"}
          </button>
        </form>

        {/* Chuyển sang trang Đăng ký */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Chưa có tài khoản?{" "}
          <Link
            to="/register"
            className="font-semibold text-[#1C1B18] underline hover:text-gray-700"
          >
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;