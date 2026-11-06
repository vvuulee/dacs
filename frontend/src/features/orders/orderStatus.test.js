import { isFinalStatus, isOnlinePayment, PAYMENT_METHODS, PROGRESS_STEPS, STATUS_LABELS } from './orderStatus';

it('trạng thái cuối', () => {
  expect(isFinalStatus('delivered')).toBe(true);
  expect(isFinalStatus('cancelled')).toBe(true);
  expect(isFinalStatus('placed')).toBe(false);
});
it('isOnlinePayment', () => {
  expect(isOnlinePayment('cash')).toBe(false);
  expect(isOnlinePayment('wallet')).toBe(true);
  expect(isOnlinePayment('bank_transfer')).toBe(true);
});
it('PROGRESS_STEPS đúng thứ tự', () =>
  expect(PROGRESS_STEPS).toEqual(['placed', 'preparing', 'delivering', 'delivered']));
it('có nhãn cho cả 6 trạng thái và 3 phương thức', () => {
  expect(Object.keys(STATUS_LABELS)).toHaveLength(6);
  expect(PAYMENT_METHODS.map((m) => m.id)).toEqual(['cash', 'bank_transfer', 'wallet']);
});
