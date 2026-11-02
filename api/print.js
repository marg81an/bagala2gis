// GET /admin/print/:slug — табличка с QR для печати (для админа или владельца по ссылке ?t=)
import { db } from '../lib/db.js';
import { getQuery, html, baseUrl, clip } from '../lib/http.js';
import { layout, esc, notFoundPage } from '../lib/html.js';
import { PRINT, normLang } from '../lib/i18n.js';
import { isAdmin } from '../lib/auth.js';
import { qrSvg } from '../lib/qr.js';

export default async function handler(req, res) {
  const q = getQuery(req);
  const lang = normLang(q.lang);
  const venue = q.slug ? await db.venueBySlug(String(q.slug)) : null;
  if (!venue || !(isAdmin(req) || (q.t && q.t === venue.owner_token))) return html(res, 404, notFoundPage(lang));

  const staff = clip(q.s, 60);
  const url = `${baseUrl(req)}/r/${encodeURIComponent(venue.slug)}${staff ? `?s=${encodeURIComponent(staff)}` : ''}`;
  const ru = PRINT.ru, kk = PRINT.kk;

  const head = `<style>
.tent{width:105mm;min-height:148mm;margin:0 auto;background:#fff;border-radius:6mm;padding:9mm 8mm;text-align:center;box-shadow:0 8px 24px rgba(17,24,39,.08);display:flex;flex-direction:column;align-items:center}
.tent h1{font-size:25px;margin:0}
.tent .kk{color:#4338ca;font-weight:700;font-size:19px;margin:2px 0 10px}
.tent .stars-big{color:#f59e0b;font-size:30px;letter-spacing:4px;margin:2px 0 8px}
#qr{width:62mm;height:62mm;margin:4px auto 10px}
#qr svg,#qr img{width:100%;height:100%}
.tent .sub{font-size:13px;color:#374151;margin:2px 0}
.tent .name{margin-top:auto;font-weight:700;font-size:16px;padding-top:8px}
.tent .logo{width:18mm;height:18mm;margin:0 auto 6px}
@media print{ body{background:#fff} .noprint{display:none!important} .tent{box-shadow:none;border:1px dashed #d1d5db} .wrap{padding:0} @page{size:A4;margin:12mm} }
</style>`;

  const body = `
<div class="card noprint">
  <h2>QR — ${esc(venue.name)}</h2>
  <form method="get" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
    <input type="hidden" name="lang" value="${lang}">
    ${q.t ? `<input type="hidden" name="t" value="${esc(q.t)}">` : ''}
    <div style="flex:1;min-width:180px"><label style="margin:0">${lang === 'kk' ? 'Қызметкер (міндетті емес)' : 'Сотрудник (необязательно)'}</label><input name="s" value="${esc(staff)}" placeholder="${lang === 'kk' ? 'мысалы: Айгерім' : 'например: Айгерим'}"></div>
    <button class="btn inline" type="submit">${lang === 'kk' ? 'Жаңарту' : 'Обновить'}</button>
    <button class="btn inline secondary" type="button" onclick="window.print()">🖨 ${lang === 'kk' ? 'Басып шығару' : 'Печать'}</button>
  </form>
  <p class="small muted" style="margin-top:10px">${esc(decodeURI(url))}</p>
</div>
<div class="tent">
  ${venue.logo_url ? `<img class="logo" src="${esc(venue.logo_url)}" alt="">` : ''}
  <h1>${ru.title}</h1>
  <div class="kk">${kk.title}</div>
  <div class="stars-big">★★★★★</div>
  <div id="qr">${qrSvg(url)}</div>
  <div class="sub">📱 ${ru.sub}</div>
  <div class="sub">📱 ${kk.sub}</div>
  <div class="sub muted">${ru.time} · ${kk.time}</div>
  <div class="name">${esc(venue.name)}${staff ? ` · ${esc(staff)}` : ''}</div>
</div>
`;
  html(res, 200, layout({ title: `QR — ${venue.name}`, body, lang, head }));
}
