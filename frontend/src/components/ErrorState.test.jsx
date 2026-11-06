import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorState from './ErrorState';
import ProductImage from './ProductImage';
import RouteErrorBoundary from './RouteErrorBoundary';

it('ErrorState hiện thông điệp và gọi onRetry khi bấm "Thử lại"', async () => {
  const onRetry = vi.fn();
  render(<ErrorState message="Không kết nối được tới máy chủ" onRetry={onRetry} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Không kết nối được tới máy chủ');
  await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(onRetry).toHaveBeenCalledOnce();
});
it('ErrorState không có onRetry thì không hiện nút', () => {
  render(<ErrorState message="Lỗi" />);
  expect(screen.queryByRole('button')).toBeNull();
});
it('ProductImage không src hiện chữ cái đầu', () => {
  render(<ProductImage src="" name="Cà phê sữa" />);
  expect(screen.getByText('C')).toBeInTheDocument();
});
it('ProductImage có src hiện ảnh với alt là tên món', () => {
  render(<ProductImage src="/a.png" name="Trà đào" />);
  expect(screen.getByAltText('Trà đào')).toHaveAttribute('src', '/a.png');
});
it('lỗi ném trong trang được RouteErrorBoundary bắt và hiện ErrorState', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const Boom = () => { throw new Error('hỏng rồi'); };
  render(<RouteErrorBoundary><Boom /></RouteErrorBoundary>);
  expect(screen.getByRole('alert')).toHaveTextContent('hỏng rồi');
  vi.restoreAllMocks();
});
