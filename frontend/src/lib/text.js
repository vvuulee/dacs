const COMBINING_MARKS = /[\u0300-\u036f]/g;

// Dùng để so khớp tìm kiếm không phân biệt hoa thường và dấu tiếng Việt.
export function normalizeText(value) {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}
