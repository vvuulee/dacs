// Dùng trong vi.mock('…/api'): adapter mock không độ trễ. File này không được import '../api'.
export async function mockApiModule() {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
}
