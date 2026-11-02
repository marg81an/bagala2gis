import { cfg } from './config.js';

export function getQuery(req) {
  if (req.query && typeof req.query === 'object') return req.query;
  const u = new URL(req.url || '/', 'http://localhost');
  return Object.fromEntries(u.searchParams);
}

function parseRaw(raw, contentType = '') {
  if (!raw) return {};
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  try { return JSON.parse(raw); } catch { return Object.fromEntries(new URLSearchParams(raw)); }
}

export async function getBody(req) {
  const ct = String(req.headers['content-type'] || '');
  let pre;
  try { pre = req.body; } catch { pre = undefined; }
  if (pre !== undefined && pre !== null) {
    if (typeof pre === 'string') return parseRaw(pre, ct);
    if (Buffer.isBuffer(pre)) return parseRaw(pre.toString('utf8'), ct);
    if (typeof pre === 'object') return pre;
  }
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 1_000_000) throw new Error('Body too large');
    chunks.push(c);
  }
  return parseRaw(Buffer.concat(chunks).toString('utf8'), ct);
}

export function send(res, status, body, type = 'text/html; charset=utf-8', headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(body);
}

export function html(res, status, body, headers = {}) {
  send(res, status, body, 'text/html; charset=utf-8', { 'Cache-Control': 'no-store', ...headers });
}

export function json(res, status, obj) {
  send(res, status, JSON.stringify(obj), 'application/json; charset=utf-8', { 'Cache-Control': 'no-store' });
}

export function redirect(res, location, headers = {}) {
  res.statusCode = 303;
  res.setHeader('Location', location);
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end();
}

export function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function isHttps(req) {
  return String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

export function baseUrl(req) {
  if (cfg.baseUrl) return cfg.baseUrl;
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost').split(',')[0].trim();
  return `${proto}://${host}`;
}

// Разрешаем только http(s)-ссылки, чтобы нельзя было подставить javascript: и т.п.
export function safeUrl(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : '';
  } catch { return ''; }
}

export function clip(value, max) {
  return String(value ?? '').trim().slice(0, max);
}
