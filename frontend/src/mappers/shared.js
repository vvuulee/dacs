export function requireField(raw, field, label = field) {
  const value = raw?.[field];
  if (value === undefined || value === null || value === '') {
    throw new Error(`Thiếu trường bắt buộc "${label}" (id: ${raw?.id ?? 'không rõ'})`);
  }
  return value;
}

export function requireMoney(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Trường "${label}" phải là số ≥ 0, nhận được: ${value}`);
  }
  return value;
}

// Bỏ phần tử hỏng nhưng luôn ghi cảnh báo để lỗi dữ liệu không bị nuốt.
export function mapList(list, mapOne, kind) {
  return list.flatMap((raw) => {
    try {
      return [mapOne(raw)];
    } catch (error) {
      console.warn(`Bỏ qua ${kind} không hợp lệ: ${error.message}`);
      return [];
    }
  });
}
