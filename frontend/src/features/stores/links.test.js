import { buildDirectionsUrl, telHref } from './links';

const PREFIX = 'https://www.google.com/maps/search/?api=1&query=';

it('buildDirectionsUrl: tiền tố cố định và query đã mã hóa', () =>
  expect(buildDirectionsUrl({ name: 'Cửa hàng Mẫu 1', street: '12 Phố Mẫu', wardName: 'Phường Mẫu 1', provinceName: 'Hà Nội' }))
    .toBe(`${PREFIX}${encodeURIComponent('Cửa hàng Mẫu 1, 12 Phố Mẫu, Phường Mẫu 1, Hà Nội')}`));
it('buildDirectionsUrl: ký tự nguy hiểm nằm trọn trong query, host vẫn là Google Maps', () => {
  const url = buildDirectionsUrl({ name: '"><script>x</script>', street: 'a&b=c', wardName: 'javascript:alert(1)', provinceName: '#frag?x=1' });
  expect(url.startsWith(PREFIX)).toBe(true);
  const parsed = new URL(url);
  expect(parsed.host).toBe('www.google.com');
  expect(parsed.pathname).toBe('/maps/search/');
  expect(parsed.hash).toBe('');
  expect([...parsed.searchParams.keys()]).toEqual(['api', 'query']);
  expect(parsed.searchParams.get('query')).toBe('"><script>x</script>, a&b=c, javascript:alert(1), #frag?x=1');
});
it('buildDirectionsUrl bỏ trường rỗng', () =>
  expect(buildDirectionsUrl({ name: 'A', street: '', wardName: '', provinceName: 'Hà Nội' }))
    .toBe(`${PREFIX}${encodeURIComponent('A, Hà Nội')}`));
it.each([
  ['028 0000 0001', 'tel:02800000001'],
  ['+84 28 0000.0001', 'tel:+842800000001'],
  ['0280000000"><b>x</b>', 'tel:0280000000'],
  ['javascript:alert(1)', 'tel:1'],
  ['', 'tel:'],
])('telHref(%j) → %s', (input, expected) => expect(telHref(input)).toBe(expected));
