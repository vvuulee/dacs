import { render, screen } from '@testing-library/react';
import { buildDirectionsUrl } from '../features/stores/links';
import StoreCard from './StoreCard';

const store = {
  id: '1', name: 'Cửa hàng Mẫu 1', street: '10 Phố Mẫu', wardName: 'Phường Mẫu 1', provinceId: 'hn',
  provinceName: 'Hà Nội', phone: '02800000001', openingHours: '07:00 – 22:00',
};

it('link Chỉ đường có đúng href, target _blank, rel noopener noreferrer', () => {
  render(<StoreCard store={store} />);
  const link = screen.getByRole('link', { name: 'Chỉ đường tới Cửa hàng Mẫu 1' });
  expect(link).toHaveAttribute('href', buildDirectionsUrl(store));
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});
it('link số điện thoại dùng tel: đã làm sạch', () => {
  render(<StoreCard store={{ ...store, phone: '028 0000 0001' }} />);
  expect(screen.getByRole('link', { name: '028 0000 0001' })).toHaveAttribute('href', 'tel:02800000001');
});
it('thiếu số điện thoại thì không có link tel', () => {
  render(<StoreCard store={{ ...store, phone: '' }} />);
  expect(screen.getAllByRole('link')).toHaveLength(1);
});
it('hiện tên, địa chỉ và giờ mở cửa nguyên văn', () => {
  render(<StoreCard store={store} />);
  expect(screen.getByRole('heading', { name: 'Cửa hàng Mẫu 1' })).toBeInTheDocument();
  expect(screen.getByText('10 Phố Mẫu, Phường Mẫu 1, Hà Nội')).toBeInTheDocument();
  expect(screen.getByText(/07:00 – 22:00/)).toBeInTheDocument();
});
