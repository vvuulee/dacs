import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { CART_STORAGE_KEY } from '../constants';
import MenuPage from '../pages/MenuPage';
import { LocationDisplay, renderWithProviders } from '../test/renderWithProviders';
import { useCart } from '../features/cart/CartContext';
import ProductModal, { ProductForm } from './ProductModal';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

const renderAt = (route) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/menu" element={<MenuPage />}>
          <Route path=":id" element={<ProductModal />} />
        </Route>
      </Routes>
      <LocationDisplay />
    </>,
    { route },
  );
const addButton = () => screen.getByRole('button', { name: /thêm vào giỏ|tạm hết/i });
const openDrink = async () => { renderAt('/menu/tra-dao'); await screen.findByRole('dialog', { name: 'Trà đào cam sả' }); };

beforeEach(() => localStorage.clear());

it('mặc định chọn size đầu và hiện tổng đúng', async () => {
  await openDrink();
  expect(screen.getByRole('radio', { name: /^Nhỏ/ })).toBeChecked();
  expect(addButton()).toHaveTextContent(/45\.000/);
});
it('chọn size Lớn và 2 topping: tổng cập nhật', async () => {
  await openDrink();
  await userEvent.click(screen.getByRole('radio', { name: /^Lớn/ }));
  await userEvent.click(screen.getByRole('checkbox', { name: /^Trân châu/ }));
  await userEvent.click(screen.getByRole('checkbox', { name: /^Kem cheese/ }));
  expect(addButton()).toHaveTextContent(/73\.000/);
});
it('số lượng không xuống dưới 1 và không vượt 99', async () => {
  await openDrink();
  expect(screen.getByRole('button', { name: 'Giảm số lượng' })).toBeDisabled();
  const plus = screen.getByRole('button', { name: 'Tăng số lượng' });
  for (let i = 0; i < 98; i += 1) fireEvent.click(plus);
  expect(screen.getByLabelText('Số lượng')).toHaveTextContent('99');
  expect(plus).toBeDisabled();
});
it('ghi chú dài hơn 200 ký tự bị chặn', async () => {
  await openDrink();
  const note = screen.getByRole('textbox', { name: /ghi chú/i });
  await userEvent.click(note);
  await userEvent.paste('a'.repeat(250));
  expect(note.value).toHaveLength(200);
});
it('Thêm vào giỏ: giỏ có dòng đúng và modal đóng', async () => {
  await openDrink();
  await userEvent.click(screen.getByRole('radio', { name: /^Vừa/ }));
  await userEvent.click(screen.getByRole('checkbox', { name: /^Thạch/ }));
  await userEvent.type(screen.getByRole('textbox', { name: /ghi chú/i }), ' ít đá ');
  await userEvent.click(screen.getByRole('button', { name: 'Tăng số lượng' }));
  await userEvent.click(addButton());
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/menu$/));
  const [line] = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)).items;
  expect(line).toMatchObject({ productId: 'tra-dao', sizeId: 'm', toppingIds: ['thach'], note: 'ít đá', quantity: 2, unitPrice: 57000, summary: 'Vừa · Thạch trái cây' });
});
it('món hết hàng: nút vô hiệu', async () => {
  renderAt('/menu/cold-brew');
  await screen.findByRole('dialog', { name: 'Cold brew cam sả' });
  expect(addButton()).toBeDisabled();
  expect(addButton()).toHaveTextContent('Tạm hết');
});
it('Esc đóng modal và giữ ?category=', async () => {
  renderAt('/menu/tra-dao?category=tra');
  await screen.findByRole('dialog');
  act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/menu\?category=tra$/);
});
it('/menu/khong-ton-tai: Menu vẫn hiện, modal báo không tồn tại kèm link về Menu', async () => {
  renderAt('/menu/khong-ton-tai');
  expect(await screen.findByText(/không tồn tại/i)).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Danh sách món' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Về Menu' })).toHaveAttribute('href', '/menu');
});

describe('ProductForm dùng lại cho quầy', () => {
  const product = {
    id: 'bac-xiu', name: 'Bạc xỉu', description: '', image: '', categoryId: 'ca-phe', basePrice: 29000,
    sizes: [{ id: 's', label: 'Nhỏ', extraPrice: 0 }], toppings: [], isAvailable: true,
  };
  function CartCount() {
    const { items } = useCart();
    return <p data-testid="count">{items.length}</p>;
  }
  it('nhãn tuỳ chỉnh; bấm thì thêm vào giỏ của provider gần nhất và gọi onDone', async () => {
    const onDone = vi.fn();
    renderWithProviders(<><ProductForm product={product} onDone={onDone} submitLabel="Thêm vào đơn" /><CartCount /></>);
    await userEvent.click(screen.getByRole('button', { name: /thêm vào đơn/i }));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(onDone).toHaveBeenCalled();
  });
});
