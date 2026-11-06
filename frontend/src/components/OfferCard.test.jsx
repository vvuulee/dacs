import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { COPY_FAILED_TEXT } from '../features/vouchers/messages';
import OfferCard from './OfferCard';

const offer = { id: '1', title: 'Giảm 10%', description: 'Mô tả ưu đãi', code: 'CHAO10', minOrder: 50000, expiresAt: '2099-01-01T00:00:00.000Z' };
afterEach(() => vi.unstubAllGlobals());

it('hiện tiêu đề, mô tả, mã, điều kiện đơn từ và hạn dùng', () => {
  render(<OfferCard offer={offer} />);
  expect(screen.getByRole('heading', { name: 'Giảm 10%' })).toBeInTheDocument();
  expect(screen.getByText('Mô tả ưu đãi')).toBeInTheDocument();
  expect(screen.getByText('CHAO10')).toBeInTheDocument();
  expect(screen.getByText(/Đơn từ 50\.000/)).toBeInTheDocument();
  expect(screen.getByText(`Hạn dùng đến ${new Date(offer.expiresAt).toLocaleDateString('vi-VN')}`)).toBeInTheDocument();
});
it('không có minOrder/expiresAt thì không hiện hai dòng đó', () => {
  render(<OfferCard offer={{ ...offer, minOrder: null, expiresAt: null }} />);
  expect(screen.queryByText(/Đơn từ/)).toBeNull();
  expect(screen.queryByText(/Hạn dùng/)).toBeNull();
});
it('bấm Sao chép mã thành công → "Đã sao chép mã CHAO10" (role status)', async () => {
  const writeText = vi.fn().mockResolvedValue();
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  render(<OfferCard offer={offer} />);
  await userEvent.click(screen.getByRole('button', { name: 'Sao chép mã CHAO10' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Đã sao chép mã CHAO10');
  expect(writeText).toHaveBeenCalledWith('CHAO10');
});
it('bấm Sao chép mã khi clipboard không dùng được → COPY_FAILED_TEXT, mã vẫn còn trên trang', async () => {
  vi.stubGlobal('navigator', {});
  render(<OfferCard offer={offer} />);
  await userEvent.click(screen.getByRole('button', { name: 'Sao chép mã CHAO10' }));
  expect(await screen.findByRole('status')).toHaveTextContent(COPY_FAILED_TEXT);
  expect(screen.getByText('CHAO10')).toBeInTheDocument();
});
it('chưa bấm thì chưa có thông báo', () => {
  render(<OfferCard offer={offer} />);
  expect(screen.queryByRole('status')).toBeNull();
});
