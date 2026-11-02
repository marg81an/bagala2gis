import { createHmac, timingSafeEqual } from 'node:crypto';
import { cfg } from './config.js';
import { parseCookies, isHttps } from './http.js';

const COOKIE = 'bagala_admin';
const sessionValue = () => createHmac('sha256', cfg.sessionSecret).update('admin:' + cfg.adminPassword).digest('hex');

function safeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export const adminConfigured = () => !!cfg.adminPassword;
export const checkPassword = (p) => adminConfigured() && safeEq(p || '', cfg.adminPassword);
export const isAdmin = (req) => adminConfigured() && safeEq(parseCookies(req)[COOKIE] || '', sessionValue());

export function loginCookie(req) {
  return `${COOKIE}=${sessionValue()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${isHttps(req) ? '; Secure' : ''}`;
}
export const logoutCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
