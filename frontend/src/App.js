import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import CartPage from './pages/CartPage';
import { CartProvider } from './context/CartContext';
import AdminProductPage from "./pages/AdminProductPage";
import AdminOrderPage from "./pages/AdminOrderPage";
import ProfilePage from "./pages/ProfilePage";
import CheckoutPage from "./pages/CheckoutPage";

function App() {
  return (
    <Router>
      <CartProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} /> 
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/orders" element={<ProfilePage initialTab="orders" />} />
          <Route path="/admin/products" element={<AdminProductPage />} />
          <Route path="/admin/orders" element={<AdminOrderPage />} />
        </Routes>
      </CartProvider>
    </Router>
  );
}

export default App;
