import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import PasswordField from './PasswordField';

function Harness({ error }) {
  const [value, setValue] = useState('');
  return <PasswordField name="password" label="Mật khẩu" value={value} onChange={setValue} error={error} autoComplete="current-password" />;
}

it('bấm "Hiện mật khẩu" đổi type sang text và nhãn nút thành "Ẩn mật khẩu"', async () => {
  render(<Harness />);
  const input = screen.getByLabelText('Mật khẩu');
  expect(input).toHaveAttribute('type', 'password');
  await userEvent.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
  expect(input).toHaveAttribute('type', 'text');
  expect(screen.getByRole('button', { name: 'Ẩn mật khẩu' })).toBeInTheDocument();
});
it('gõ cập nhật giá trị; có lỗi thì aria-invalid và mô tả lỗi', async () => {
  render(<Harness error="Nhập mật khẩu" />);
  const input = screen.getByLabelText('Mật khẩu');
  await userEvent.type(input, 'abc');
  expect(input).toHaveValue('abc');
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAccessibleDescription('Nhập mật khẩu');
});
