import styles from './QrPlaceholder.module.css';

const SIZE = 21;
const FINDER = 7;
const FILL_RATIO = 0.5;
const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

// Mã QR mẫu: lưới ngẫu nhiên xác định theo nội dung, không quét được.
function hash(text) {
  let h = FNV_OFFSET;
  for (const char of text) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
}

function makeRandom(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function finderCell(x, y) {
  const lx = x < FINDER ? x : x - (SIZE - FINDER);
  const ly = y < FINDER ? y : y - (SIZE - FINDER);
  const border = lx === 0 || lx === FINDER - 1 || ly === 0 || ly === FINDER - 1;
  const core = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
  return border || core;
}

const inFinder = (x, y) =>
  (x < FINDER && y < FINDER) || (x >= SIZE - FINDER && y < FINDER) || (x < FINDER && y >= SIZE - FINDER);

function buildPath(content) {
  const random = makeRandom(hash(content));
  let path = '';
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const dark = inFinder(x, y) ? finderCell(x, y) : random() < FILL_RATIO;
      if (dark) path += `M${x} ${y}h1v1h-1z`;
    }
  }
  return path;
}

export default function QrPlaceholder({ content }) {
  return (
    <figure className={styles.figure}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Mã QR mẫu" className={styles.qr} shapeRendering="crispEdges">
        <rect width={SIZE} height={SIZE} fill="#fff" />
        <path d={buildPath(content)} fill="#3b2a1e" />
      </svg>
      <figcaption className={styles.caption}>Mã QR mẫu, không quét được</figcaption>
    </figure>
  );
}
