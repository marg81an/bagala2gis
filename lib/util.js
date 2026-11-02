import { randomBytes } from 'node:crypto';
import { cfg } from './config.js';

export const token = (bytes = 16) => randomBytes(bytes).toString('hex');
export const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ''));

const MAP = {
  а: 'a', ә: 'a', б: 'b', в: 'v', г: 'g', ғ: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', і: 'i',
  к: 'k', қ: 'q', л: 'l', м: 'm', н: 'n', ң: 'n', о: 'o', ө: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ұ: 'u',
  ү: 'u', ф: 'f', х: 'h', һ: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};
export function slugify(s) {
  const out = String(s || '').toLowerCase().split('').map((c) => (MAP[c] ?? c)).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return out || 'venue';
}

export const starsText = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export function fmtDate(iso, lang = 'ru') {
  try {
    return new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : 'ru-RU', {
      timeZone: cfg.tz, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch { return iso; }
}

export function computeStats(reviews, threshold = 4) {
  const dist = [0, 0, 0, 0, 0];
  let sum = 0, low = 0, high = 0, clicks = 0;
  const staff = new Map();
  for (const r of reviews) {
    dist[r.rating - 1]++;
    sum += r.rating;
    if (r.rating < threshold) low++; else high++;
    if (r.clicked) clicks++;
    if (r.staff) {
      const s = staff.get(r.staff) || { name: r.staff, count: 0, sum: 0, low: 0 };
      s.count++; s.sum += r.rating; if (r.rating < threshold) s.low++;
      staff.set(r.staff, s);
    }
  }
  const total = reviews.length;
  return {
    total, low, high, clicks, dist,
    avg: total ? sum / total : 0,
    conversion: high ? clicks / high : 0,
    staff: [...staff.values()].map((s) => ({ ...s, avg: s.sum / s.count })).sort((a, b) => b.count - a.count),
  };
}
