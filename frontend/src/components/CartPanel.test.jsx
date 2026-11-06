import { screen } from '@testing-library/react';
import { CART_STORAGE_KEY } from '../constants';
import { renderWithProviders } from '../test/renderWithProviders';
import CartPanel from './CartPanel';

const items = [
  { key: 'k1', productId: 'a', name: 'Trà đào', image: '', sizeId: 'm', toppingIds: [], note: 'ít đá', quantity: 2, unitPrice: 30000, summary: 'Vừa' },
  { key: 'k2', productId: 'b', name: 'Bạc xỉu', image: '', sizeId: null, toppingIds: [], note: '', quantity: 1, unitPrice: 45000, summary: '' },
];
beforeEach(() => localStorage.clear());

it('giỏ trống hiện thông báo', () => {
  renderWithProviders(<CartPanel />);
  expect(screen.getByText('Giỏ hàng trống')).toBeInTheDocument();
});
it('hiện các dòng, ghi chú, tạm tính và link Xem giỏ hàng', () => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 1, items }));
  renderWithProviders(<CartPanel />);
  expect(screen.getByText('Trà đào')).toBeInTheDocument();
  expect(screen.getByText('Vừa')).toBeInTheDocument();
  expect(screen.getByText(/ít đá/)).toBeInTheDocument();
  expect(screen.getByTestId('subtotal')).toHaveTextContent(/105\.000/);
  expect(screen.getByRole('link', { name: 'Xem giỏ hàng' })).toHaveAttribute('href', '/cart');
});
