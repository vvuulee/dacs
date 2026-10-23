import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    // Kiểm tra mật khẩu nhập lại
    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }

    setLoading(true);
    try {
      await axios.post("http://localhost:8080/api/auth/register", {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      alert("Đăng ký tài khoản thành công! Vui lòng đăng nhập.");
      navigate("/login");
    } catch (err) {
      console.error("Lỗi đăng ký:", err);
      const resData = err.response?.data;
      if (typeof resData === "string") {
        setError(resData);
      } else {
        setError(
          resData?.message ||
            "Đăng ký thất bại! Tên đăng nhập hoặc email có thể đã tồn tại."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full bg-[#FAF8F5] border border-[#E5E0D8] rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-[#1C1B18] tracking-tight">
            Tạo tài khoản mới
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Trở thành khách hàng thân thiết của Laptop Store
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1B18] mb-1">
              Tên đăng nhập
            </label>
            <input
              type="text"
              name="username"
              required
              value={formData.username}
              onChange={handleChange}
              placeholder="Nhập username..."
              className="w-full px-4 py-3 rounded-xl border border-[#D8D2C7] bg-white text-[#1C1B18] focus:outline-none focus:ring-2 focus:ring-[#1C1B18] transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C1B18] mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="example@gmail.com"
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

          <div>
            <label className="block text-sm font-medium text-[#1C1B18] mb-1">
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-[#D8D2C7] bg-white text-[#1C1B18] focus:outline-none focus:ring-2 focus:ring-[#1C1B18] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 bg-[#1C1B18] text-[#F5F2EB] font-semibold rounded-xl hover:bg-gray-800 transition duration-200 shadow-md disabled:opacity-50"
          >
            {loading ? "Đang tạo tài khoản..." : "Đăng Ký"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            className="font-semibold text-[#1C1B18] underline hover:text-gray-700"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;