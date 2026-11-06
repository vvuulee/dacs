import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section style={{ textAlign: 'center', padding: '64px 0' }}>
      <h1>Không tìm thấy trang</h1>
      <p>Đường dẫn này không tồn tại hoặc đã được chuyển đi.</p>
      <Link to="/">Về trang chủ</Link>
    </section>
  );
}
