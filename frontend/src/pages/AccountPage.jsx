import { startTransition } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ChangePasswordForm from '../components/ChangePasswordForm';
import ProfileForm from '../components/ProfileForm';
import { useAuth } from '../features/auth/AuthContext';
import styles from './AccountPage.module.css';

export default function AccountPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // React Router bọc navigate() trong một transition nên đổi trang bị trễ, còn đăng xuất thì cập nhật ngay:
  // nếu để riêng, ProtectedRoute thấy "chưa đăng nhập" trước và đẩy sang /login?returnTo=/account.
  // Đặt cả hai vào cùng một transition để chúng render chung một lượt, rồi ProtectedRoute đã gỡ khỏi cây.
  const signOut = () => {
    startTransition(() => {
      navigate('/');
      logout();
    });
  };

  return (
    <>
      <h1>Tài khoản</h1>
      <div className={styles.layout}>
        <section aria-labelledby="profile-title">
          <h2 id="profile-title">Hồ sơ</h2>
          <ProfileForm />
        </section>
        <section aria-labelledby="password-title">
          <h2 id="password-title">Đổi mật khẩu</h2>
          <ChangePasswordForm />
          <p><Link to="/account/orders">Lịch sử đơn</Link></p>
          <button type="button" className={styles.logout} onClick={signOut}>Đăng xuất</button>
        </section>
      </div>
    </>
  );
}
