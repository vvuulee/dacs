import { canTransition, CANCELLABLE, NEXT_STATUS, isFinalStatus, isOnlinePayment, PAYMENT_METHODS, PROGRESS_STEPS, STATUS_LABELS } from './orderStatus';

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
it('có nhãn cho cả 7 trạng thái và 3 phương thức', () => {
  expect(Object.keys(STATUS_LABELS)).toHaveLength(7);
  expect(PAYMENT_METHODS.map((m) => m.id)).toEqual(['cash', 'bank_transfer', 'wallet']);
});
it('completed có nhãn Hoàn tất', () => expect(STATUS_LABELS.completed).toBe('Hoàn tất'));
it('NEXT_STATUS và CANCELLABLE', () => {
  expect(NEXT_STATUS).toEqual({ placed: 'preparing', preparing: 'delivering', delivering: 'delivered' });
  expect(CANCELLABLE).toEqual(['placed', 'preparing']);
});
it('canTransition', () => {
  expect(canTransition('preparing', 'delivering')).toBe(true);
  expect(canTransition('placed', 'cancelled')).toBe(true);
  expect(canTransition('delivering', 'cancelled')).toBe(false);
  expect(canTransition('placed', 'delivered')).toBe(false);
  expect(canTransition('awaiting_payment', 'preparing')).toBe(false);
});
