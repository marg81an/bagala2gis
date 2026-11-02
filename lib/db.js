// Хранилище: Supabase (продакшн) или локальный JSON-файл (для разработки без настроек).
import { cfg } from './config.js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const VENUE_FIELDS = ['slug', 'name', 'logo_url', 'gis_url', 'google_url', 'owner_token', 'tg_link_code',
  'tg_chat_id', 'owner_lang', 'threshold', 'notify_all', 'active'];
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

export function storageMode() {
  if (cfg.supabaseUrl && cfg.supabaseKey) return 'supabase';
  if (cfg.isVercel) return 'missing';
  return 'dev';
}

// ---------- Supabase (REST, без зависимостей) ----------
async function sb(pathAndQuery, { method = 'GET', body, prefer } = {}) {
  const key = cfg.supabaseKey;
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_')) headers.Authorization = `Bearer ${key}`; // старые JWT-ключи
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${cfg.supabaseUrl}/rest/v1/${pathAndQuery}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
const enc = encodeURIComponent;

const supabase = {
  async venueBy(field, value) {
    const rows = await sb(`venues?${field}=eq.${enc(value)}&select=*&limit=1`);
    return rows?.[0] || null;
  },
  async listVenues() { return sb('venues?select=*&order=created_at.desc'); },
  async createVenue(data) {
    const rows = await sb('venues', { method: 'POST', body: pick(data, VENUE_FIELDS), prefer: 'return=representation' });
    return rows[0];
  },
  async updateVenue(id, patch) {
    const rows = await sb(`venues?id=eq.${enc(id)}`, { method: 'PATCH', body: pick(patch, VENUE_FIELDS), prefer: 'return=representation' });
    return rows?.[0] || null;
  },
  async insertReview(r) {
    const rows = await sb('reviews', { method: 'POST', body: r, prefer: 'return=representation' });
    return rows[0];
  },
  async markClicked(id, target) {
    await sb(`reviews?id=eq.${enc(id)}`, { method: 'PATCH', body: { clicked: target }, prefer: 'return=minimal' });
  },
  async listReviews(venueId, sinceIso, limit = 5000) {
    return sb(`reviews?venue_id=eq.${enc(venueId)}&created_at=gte.${enc(sinceIso)}&select=*&order=created_at.desc&limit=${limit}`);
  },
};

// ---------- Локальный JSON-файл ----------
const DEV_FILE = path.join(process.cwd(), '.data', 'dev-db.json');
function load() {
  try { return JSON.parse(fs.readFileSync(DEV_FILE, 'utf8')); } catch { return { venues: [], reviews: [] }; }
}
function save(db) {
  fs.mkdirSync(path.dirname(DEV_FILE), { recursive: true });
  fs.writeFileSync(DEV_FILE, JSON.stringify(db, null, 2));
}
const VENUE_DEFAULTS = { logo_url: null, gis_url: null, google_url: null, tg_chat_id: null, owner_lang: 'ru', threshold: 4, notify_all: false, active: true };

const dev = {
  async venueBy(field, value) {
    return load().venues.find((v) => String(v[field]) === String(value)) || null;
  },
  async listVenues() { return load().venues.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)); },
  async createVenue(data) {
    const db = load();
    if (db.venues.some((v) => v.slug === data.slug)) throw new Error('duplicate slug');
    const v = { id: randomUUID(), ...VENUE_DEFAULTS, ...pick(data, VENUE_FIELDS), created_at: new Date().toISOString() };
    db.venues.push(v); save(db); return v;
  },
  async updateVenue(id, patch) {
    const db = load();
    const v = db.venues.find((x) => x.id === id);
    if (!v) return null;
    Object.assign(v, pick(patch, VENUE_FIELDS)); save(db); return v;
  },
  async insertReview(r) {
    const db = load();
    const row = { id: randomUUID(), comment: null, contact: null, staff: null, lang: null, clicked: null, ...r, created_at: new Date().toISOString() };
    db.reviews.push(row); save(db); return row;
  },
  async markClicked(id, target) {
    const db = load();
    const r = db.reviews.find((x) => x.id === id);
    if (r) { r.clicked = target; save(db); }
  },
  async listReviews(venueId, sinceIso, limit = 5000) {
    return load().reviews
      .filter((r) => r.venue_id === venueId && r.created_at >= sinceIso)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  },
};

function backend() {
  const mode = storageMode();
  if (mode === 'supabase') return supabase;
  if (mode === 'dev') return dev;
  throw new Error('Не настроены SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY');
}

export const db = {
  venueBySlug: (s) => backend().venueBy('slug', s),
  venueByToken: (t) => backend().venueBy('owner_token', t),
  venueByLinkCode: (c) => backend().venueBy('tg_link_code', c),
  venueByChatId: (id) => backend().venueBy('tg_chat_id', id),
  venueById: (id) => backend().venueBy('id', id),
  listVenues: () => backend().listVenues(),
  createVenue: (d) => backend().createVenue(d),
  updateVenue: (id, p) => backend().updateVenue(id, p),
  insertReview: (r) => backend().insertReview(r),
  markClicked: (id, t) => backend().markClicked(id, t),
  listReviews: (v, s, l) => backend().listReviews(v, s, l),
};
