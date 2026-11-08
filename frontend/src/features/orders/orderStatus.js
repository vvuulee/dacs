export const STATUS_LABELS = {
  awaiting_payment: 'Chờ thanh toán',
  placed: 'Chờ xác nhận',
  preparing: 'Đang pha chế',
  delivering: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  completed: 'Hoàn tất',
};

export const PAYMENT_STATUS_LABELS = {
  unpaid: 'Thanh toán khi nhận hàng',
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  expired: 'Hết hạn thanh toán',
};

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Tiền mặt, thanh toán khi nhận hàng', online: false },
  { id: 'bank_transfer', label: 'Chuyển khoản QR', online: true },
  { id: 'wallet', label: 'Ví điện tử', online: true },
];

export const PROGRESS_STEPS = ['placed', 'preparing', 'delivering', 'delivered'];

const FINAL_STATUSES = ['delivered', 'cancelled', 'completed'];

// Chỉ backend quyết định chuyển bước; frontend dùng bảng này để chọn nút hiển thị.
export const NEXT_STATUS = { placed: 'preparing', preparing: 'delivering', delivering: 'delivered' };
export const CANCELLABLE = ['placed', 'preparing'];
export const canTransition = (from, to) =>
  NEXT_STATUS[from] === to || (to === 'cancelled' && CANCELLABLE.includes(from));

export const isFinalStatus = (status) => FINAL_STATUSES.includes(status);
export const isOnlinePayment = (methodId) => PAYMENT_METHODS.find((m) => m.id === methodId)?.online === true;

// Dùng chung cho mọi nơi tra đơn: sai mã hay sai SĐT đều hiện cùng một thông báo.
export const ORDER_NOT_FOUND_TEXT = 'Không tìm thấy đơn với mã và số điện thoại này.';
