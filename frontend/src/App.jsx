import { lazy, Suspense } from 'react';
import { Outlet, Route, Routes } from 'react-router-dom';
import Footer from './components/Footer';
import Header from './components/Header';
import ProductModal from './components/ProductModal';
import ProtectedRoute from './components/ProtectedRoute';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import Skeleton from './components/Skeleton';
import AccountPage from './pages/AccountPage';
import AccountOrdersPage from './pages/AccountOrdersPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import HomePage from './pages/HomePage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OffersPage from './pages/OffersPage';
import StoresPage from './pages/StoresPage';
import RegisterPage from './pages/RegisterPage';
import OrdersPage from './pages/OrdersPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import PaymentPage from './pages/PaymentPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import LoginPage from './pages/LoginPage';
import MenuPage from './pages/MenuPage';
import NotFoundPage from './pages/NotFoundPage';
import StaffLayout from './staff/StaffLayout';
import StaffRoute from './staff/StaffRoute';
import styles from './App.module.css';

// Trang nhân viên tải lười: khách không phải tải code của khu nhân viên.
const StaffLoginPage = lazy(() => import('./staff/pages/StaffLoginPage'));
const PosPage = lazy(() => import('./staff/pages/PosPage'));
const OnlineOrdersPage = lazy(() => import('./staff/pages/OnlineOrdersPage'));
const VouchersPage = lazy(() => import('./staff/pages/VouchersPage'));
const InventoryPage = lazy(() => import('./staff/pages/InventoryPage'));
const HistoryPage = lazy(() => import('./staff/pages/HistoryPage'));
const StaffAccountPage = lazy(() => import('./staff/pages/StaffAccountPage'));

function Layout() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="staff">
        <Route path="login" element={<Suspense fallback={<Skeleton height="320px" />}><StaffLoginPage /></Suspense>} />
        <Route element={<StaffRoute />}>
          <Route element={<StaffLayout />}>
            <Route index element={<PosPage />} />
            <Route path="orders" element={<OnlineOrdersPage />} />
            <Route path="vouchers" element={<VouchersPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="account" element={<StaffAccountPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Route>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="menu" element={<MenuPage />}>
          <Route path=":id" element={<ProductModal />} />
        </Route>
        <Route path="stores" element={<StoresPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="payment/:id" element={<PaymentPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="account" element={<AccountPage />} />
          <Route path="account/orders" element={<AccountOrdersPage />} />
        </Route>
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderTrackingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
