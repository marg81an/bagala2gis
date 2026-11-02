// GET /d/:token — личный кабинет владельца (доступ по секретной ссылке)
import { db } from '../lib/db.js';
import { getQuery, html } from '../lib/http.js';
import { layout, esc, notFoundPage } from '../lib/html.js';
import { DASH, normLang } from '../lib/i18n.js';
import { cfg } from '../lib/config.js';
import { computeStats, fmtDate, starsText } from '../lib/util.js';

const PERIODS = [7, 30, 90];

export default async function handler(req, res) {
  const q = getQuery(req);
  const lang = normLang(q.lang);
  let venue = null;
  try { venue = q.token ? await db.venueByToken(String(q.token)) : null; } catch (e) { console.error(e); }
  if (!venue) return html(res, 404, notFoundPage(lang));

  const t = DASH[lang];
  const days = PERIODS.includes(Number(q.days)) ? Number(q.days) : 30;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const reviews = await db.listReviews(venue.id, since);
  const s = computeStats(reviews, venue.threshold || 4);
  const base = `/d/${encodeURIComponent(venue.owner_token)}`;
  const link = (p) => `${base}?${new URLSearchParams({ days: String(p.days ?? days), lang: p.lang ?? lang })}`;
  const maxDist = Math.max(1, ...s.dist);

  const tgLinks = cfg.botUsername ? `
      <a class="btn inline" href="https://t.me/${esc(cfg.botUsername)}?start=${esc(venue.tg_link_code)}" target="_blank" rel="noopener">${t.tg_private}</a>
      <a class="btn inline secondary" href="https://t.me/${esc(cfg.botUsername)}?startgroup=${esc(venue.tg_link_code)}" target="_blank" rel="noopener">${t.tg_group}</a>` : '';

  const body = `
<div class="top">
  <a class="brand" href="${link({})}">Bagala</a>
  <div class="lang"><a href="${link({ lang: 'ru' })}" class="${lang === 'ru' ? 'on' : ''}">RU</a><a href="${link({ lang: 'kk' })}" class="${lang === 'kk' ? 'on' : ''}">ҚАЗ</a></div>
</div>
<div class="card">
  <div class="top" style="margin:0;flex-wrap:wrap">
    <div><h1>${esc(venue.name)}</h1><div class="muted">${t.title}</div></div>
    <div class="tabs">${PERIODS.map((p) => `<a class="${p === days ? 'on' : ''}" href="${link({ days: p })}">${t.days(p)}</a>`).join('')}</div>
  </div>
</div>

<div class="grid" style="margin-bottom:16px">
  <div class="stat"><div class="v">${s.total ? s.avg.toFixed(2) : '—'} <span style="color:var(--star)">★</span></div><div class="l">${t.avg}</div></div>
  <div class="stat"><div class="v">${s.total}</div><div class="l">${t.total}</div></div>
  <div class="stat"><div class="v" style="color:var(--bad)">${s.low}</div><div class="l">${t.low(venue.threshold || 4)}</div></div>
  <div class="stat"><div class="v" style="color:var(--ok)">${s.clicks}</div><div class="l">${t.clicks}${s.high ? ` · ${Math.round(s.conversion * 100)}% ${t.conv}` : ''}</div></div>
</div>

<div class="two">
  <div class="card">
    <h2>${t.dist}</h2>
    ${[5, 4, 3, 2, 1].map((n) => `<div class="row"><span class="k">${n} ★</span><div class="bar"><span style="width:${(s.dist[n - 1] / maxDist) * 100}%"></span></div><span class="n">${s.dist[n - 1]}</span></div>`).join('')}
  </div>
  <div class="card">
    <p><b>${venue.tg_chat_id ? t.tg_on : t.tg_off}</b></p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">${tgLinks}</div>
    <p class="links small"><a href="/admin/print/${esc(venue.slug)}?t=${esc(venue.owner_token)}&lang=${lang}" target="_blank">🖨 ${t.qr}</a><a href="/r/${esc(venue.slug)}" target="_blank">↗ ${t.page}</a></p>
  </div>
</div>

${s.staff.length ? `
<div class="card scroll">
  <h2>${t.staff}</h2>
  <table><tr><th>${t.staff_name}</th><th>${t.count}</th><th>${t.avg_short}</th><th>${t.low_short}</th></tr>
  ${s.staff.map((x) => `<tr><td>${esc(x.name)}</td><td>${x.count}</td><td>${x.avg.toFixed(2)} ★</td><td>${x.low}</td></tr>`).join('')}
  </table>
</div>` : ''}

<div class="card scroll">
  <h2>${t.latest}</h2>
  ${reviews.length ? `<table><tr><th>${t.when}</th><th>${t.rating}</th><th>${t.comment}</th><th>${t.contact}</th></tr>
  ${reviews.slice(0, 100).map((r) => {
    const low = r.rating < (venue.threshold || 4);
    return `<tr>
      <td class="muted" style="white-space:nowrap">${esc(fmtDate(r.created_at, lang))}</td>
      <td><span class="pill ${low ? 'bad' : 'good'}">${starsText(r.rating)}</span>${r.clicked ? `<div class="small muted">↗ ${t.went}</div>` : ''}</td>
      <td>${r.comment ? esc(r.comment) : `<span class="muted">${t.no_comment}</span>`}${r.staff ? `<div class="small muted">👤 ${esc(r.staff)}</div>` : ''}</td>
      <td>${esc(r.contact || '')}</td></tr>`;
  }).join('')}</table>` : `<p class="muted">${t.none}</p>`}
</div>
<div class="footer">Bagala</div>`;

  html(res, 200, layout({ title: `${venue.name} — Bagala`, body, lang, wide: true }));
}
