import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CART_STORAGE_KEY } from '../constants';
import { renderWithProviders } from '../test/renderWithProviders';
import CartPage from './CartPage';

const items = [
  { key: 'k1', productId: 'a', name: 'Trà đào', image: '', sizeId: 'm', toppingIds: [], note: '', quantity: 2, unitPrice: 30000, summary: 'Vừa' },
  { key: 'k2', productId: 'b', name: 'Bạc xỉu', image: '', sizeId: null, toppingIds: [], note: '', quantity: 1, unitPrice: 45000, summary: '' },
];
const seed = () => localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 1, items }));
beforeEach(() => localStorage.clear());

it('giỏ trống hiện EmptyState và link về /menu', () => {
  renderWithProviders(<CartPage />);
  expect(screen.getByText('Giỏ hàng trống')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Về Menu' })).toHaveAttribute('href', '/menu');
});
it('tạm tính = Σ unitPrice × quantity định dạng VND', () => {
  seed();
  renderWithProviders(<CartPage />);
  expect(screen.getByTestId('subtotal')).toHaveTextContent(/105\.000/);
});
it('tăng số lượng cập nhật tạm tính', async () => {
  seed();
  renderWithProviders(<CartPage />);
  await userEvent.click(screen.getByRole('button', { name: 'Tăng số lượng Trà đào' }));
  expect(screen.getByLabelText('Số lượng Trà đào')).toHaveTextContent('3');
  expect(screen.getByTestId('subtotal')).toHaveTextContent(/135\.000/);
});
it('giảm số lượng cập nhật tạm tính', async () => {
  seed();
  renderWithProviders(<CartPage />);
  await userEvent.click(screen.getByRole('button', { name: 'Giảm số lượng Trà đào' }));
  expect(screen.getByTestId('subtotal')).toHaveTextContent(/75\.000/);
});
it('giảm tại 1 xóa dòng', async () => {
  seed();
  renderWithProviders(<CartPage />);
  await userEvent.click(screen.getByRole('button', { name: 'Giảm số lượng Bạc xỉu' }));
  expect(screen.queryByText('Bạc xỉu')).toBeNull();
});
it('nút xóa bỏ dòng', async () => {
  seed();
  renderWithProviders(<CartPage />);
  await userEvent.click(screen.getByRole('button', { name: 'Xóa Trà đào' }));
  expect(screen.queryByText('Trà đào')).toBeNull();
  expect(screen.getByTestId('subtotal')).toHaveTextContent(/45\.000/);
});
it('tải lại trang (mount mới) vẫn còn giỏ từ localStorage', async () => {
  seed();
  const first = renderWithProviders(<CartPage />);
  await userEvent.click(screen.getByRole('button', { name: 'Tăng số lượng Trà đào' }));
  first.unmount();
  renderWithProviders(<CartPage />);
  expect(screen.getByLabelText('Số lượng Trà đào')).toHaveTextContent('3');
});
it('link Thanh toán trỏ tới /checkout', () => {
  seed();
  renderWithProviders(<CartPage />);
  expect(screen.getByRole('link', { name: 'Thanh toán' })).toHaveAttribute('href', '/checkout');
});

it('có món → gợi ý mã giảm giá và link Xem ưu đãi → /offers', () => {
  seed();
  renderWithProviders(<CartPage />);
  expect(screen.getByText(/Có mã giảm giá\? Nhập ở bước thanh toán/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Xem ưu đãi' })).toHaveAttribute('href', '/offers');
});
it('giỏ trống → không hiện gợi ý mã giảm giá', () => {
  renderWithProviders(<CartPage />);
  expect(screen.queryByText(/Có mã giảm giá/)).toBeNull();
  expect(screen.queryByRole('link', { name: 'Xem ưu đãi' })).toBeNull();
});
