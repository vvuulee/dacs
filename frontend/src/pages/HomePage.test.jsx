import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { renderWithProviders } from '../test/renderWithProviders';
import HomePage from './HomePage';

vi.mock('../hooks/useCategories', () => ({ useCategories: vi.fn() }));
vi.mock('../hooks/useProducts', () => ({ useProducts: vi.fn() }));

const categories = [{ id: 'tra', name: 'Trà trái cây', image: '' }, { id: 'ca-phe', name: 'Cà phê', image: '' }];
const products = Array.from({ length: 10 }, (_, i) => ({
  id: `p${i}`, name: `Món ${i}`, description: '', image: '', categoryId: 'tra', basePrice: 30000, sizes: [], toppings: [], isAvailable: true,
}));
products[0] = { ...products[0], name: 'Món hết hàng', isAvailable: false };
const ok = (data) => ({ data, isPending: false, isError: false });

beforeEach(() => {
  useCategories.mockReturnValue(ok(categories));
  useProducts.mockReturnValue(ok(products));
});

it('hiện danh mục có link /menu?category=', () => {
  renderWithProviders(<HomePage />);
  expect(screen.getByRole('link', { name: 'Trà trái cây' })).toHaveAttribute('href', '/menu?category=tra');
});
it('Món bán chạy tối đa 8 và bỏ món hết hàng', () => {
  renderWithProviders(<HomePage />);
  const featured = screen.getByRole('region', { name: 'Món bán chạy' });
  expect(within(featured).getAllByRole('link')).toHaveLength(8);
  expect(within(featured).queryByText('Món hết hàng')).toBeNull();
  expect(within(featured).getAllByRole('link')[0]).toHaveAttribute('href', '/menu/p1');
});
it('đang tải: vùng món bán chạy aria-busy', () => {
  useProducts.mockReturnValue({ isPending: true, isError: false });
  renderWithProviders(<HomePage />);
  expect(screen.getByRole('region', { name: 'Món bán chạy' })).toHaveAttribute('aria-busy', 'true');
});
it('lỗi tải món hiện ErrorState; Thử lại gọi refetch', async () => {
  const refetch = vi.fn();
  useProducts.mockReturnValue({ isPending: false, isError: true, error: { message: 'Mất kết nối' }, refetch });
  renderWithProviders(<HomePage />);
  expect(screen.getByRole('alert')).toHaveTextContent('Mất kết nối');
  await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(refetch).toHaveBeenCalledOnce();
});
