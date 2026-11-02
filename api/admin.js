// /admin — панель управления для тебя: заведения, ссылки, QR, настройка Telegram
import { db, storageMode } from '../lib/db.js';
import { getQuery, getBody, html, redirect, baseUrl, safeUrl, clip } from '../lib/http.js';
import { layout, esc } from '../lib/html.js';
import { isAdmin, checkPassword, loginCookie, logoutCookie, adminConfigured } from '../lib/auth.js';
import { cfg } from '../lib/config.js';
import { tgCall } from '../lib/telegram.js';
import { slugify, token } from '../lib/util.js';

const back = (msg, extra = '') => `/admin?msg=${encodeURIComponent(msg)}${extra}`;

function loginPage(msg) {
  return layout({ title: 'Bagala — вход', body: `
<div class="top"><span class="brand">Bagala · админка</span></div>
<div class="card">
  <h1>Вход</h1>
  ${msg ? `<div class="flash err">${esc(msg)}</div>` : ''}
  ${adminConfigured() ? `
  <form method="post" action="/api/admin">
    <input type="hidden" name="action" value="login">
    <label>Пароль</label><input type="password" name="password" autofocus required>
    <button class="btn" type="submit">Войти</button>
  </form>` : `<div class="flash err">Задайте переменную окружения <code>ADMIN_PASSWORD</code> и перезапустите сервер.</div>`}
</div>` });
}

function venueForm(v = {}) {
  const sel = (a, b) => (String(a) === String(b) ? 'selected' : '');
  return `
  <label>Название заведения *</label><input name="name" required maxlength="80" value="${esc(v.name || '')}" placeholder="Кофейня «Арай»">
  <label>Ссылка на отзывы в 2ГИС</label><input name="gis_url" type="url" value="${esc(v.gis_url || '')}" placeholder="https://2gis.kz/...">
  <label>Ссылка на отзывы в Google (необязательно)</label><input name="google_url" type="url" value="${esc(v.google_url || '')}" placeholder="https://g.page/r/.../review">
  <label>Ссылка на логотип (необязательно)</label><input name="logo_url" type="url" value="${esc(v.logo_url || '')}" placeholder="https://...png">
  <div class="two">
    <div><label>Язык уведомлений владельцу</label><select name="owner_lang"><option value="ru" ${sel(v.owner_lang, 'ru')}>Русский</option><option value="kk" ${sel(v.owner_lang, 'kk')}>Қазақша</option></select></div>
    <div><label>Что считать жалобой</label><select name="threshold">
      <option value="4" ${sel(v.threshold ?? 4, 4)}>1–3 звезды</option>
      <option value="5" ${sel(v.threshold, 5)}>1–4 звезды</option>
      <option value="3" ${sel(v.threshold, 3)}>1–2 звезды</option></select></div>
  </div>
  <label class="check"><input type="checkbox" name="notify_all" ${v.notify_all ? 'checked' : ''}> Присылать в Telegram все оценки, не только жалобы</label>`;
}

async function panel(req, q) {
  const venues = await db.listVenues();
  const base = baseUrl(req);
  const mode = storageMode();
  const editing = q.edit ? venues.find((v) => v.id === q.edit) : null;
  const flash = q.msg ? `<div class="flash${q.err ? ' err' : ''}">${esc(q.msg)}</div>` : '';

  const rows = venues.map((v) => `
    <tr>
      <td><b>${esc(v.name)}</b>${v.active ? '' : ' <span class="pill bad">выключено</span>'}<div class="small muted">/r/${esc(v.slug)}</div></td>
      <td>${v.tg_chat_id ? '<span class="pill good">подключён</span>' : '<span class="pill">нет</span>'}</td>
      <td class="links small">
        <a href="/r/${esc(v.slug)}" target="_blank">Страница</a>
        <a href="/d/${esc(v.owner_token)}" target="_blank">Кабинет</a>
        <a href="/admin/print/${esc(v.slug)}" target="_blank">QR</a>
        <a href="/admin?edit=${esc(v.id)}">Изменить</a>
      </td>
    </tr>`).join('');

  const editCard = editing ? `
<div class="card" id="edit">
  <h2>Изменить: ${esc(editing.name)}</h2>
  <p class="small">Ссылка для владельца (кабинет): <code>${esc(base)}/d/${esc(editing.owner_token)}</code></p>
  ${cfg.botUsername ? `<p class="small">Подключить Telegram: <code>https://t.me/${esc(cfg.botUsername)}?start=${esc(editing.tg_link_code)}</code></p>` : ''}
  <form method="post" action="/api/admin">
    <input type="hidden" name="action" value="update"><input type="hidden" name="id" value="${esc(editing.id)}">
    ${venueForm(editing)}
    <label class="check"><input type="checkbox" name="active" ${editing.active ? 'checked' : ''}> Заведение активно (страница оценки работает)</label>
    <label class="check"><input type="checkbox" name="reset_tg"> Отключить Telegram и выдать новую ссылку подключения</label>
    <label class="check"><input type="checkbox" name="reset_token"> Выдать новую ссылку на кабинет (старая перестанет работать)</label>
    <button class="btn" type="submit">Сохранить</button>
    <a class="btn ghost" href="/admin">Отмена</a>
  </form>
</div>` : '';

  const body = `
<div class="top">
  <span class="brand">Bagala · админка</span>
  <form method="post" action="/api/admin"><input type="hidden" name="action" value="logout"><button class="btn inline secondary" type="submit">Выйти</button></form>
</div>
${flash}
<div class="card">
  <h2>Настройка</h2>
  <p>${mode === 'supabase' ? '✅ База Supabase подключена' : '🧪 Тестовый режим: данные хранятся в файле <code>.data/dev-db.json</code>'}</p>
  <p>${cfg.botToken ? `✅ Telegram-бот: <b>@${esc(cfg.botUsername || '— укажите TELEGRAM_BOT_USERNAME')}</b>` : '⚠️ Telegram не настроен (TELEGRAM_BOT_TOKEN)'}</p>
  ${cfg.botToken ? `<form method="post" action="/api/admin"><input type="hidden" name="action" value="setwebhook">
    <button class="btn inline" type="submit">Подключить вебхук бота</button>
    <span class="small muted"> → ${esc(base)}/api/telegram (нажмите один раз после публикации сайта)</span></form>` : ''}
</div>
${editCard}
<div class="card scroll">
  <h2>Заведения (${venues.length})</h2>
  ${venues.length ? `<table><tr><th>Заведение</th><th>Telegram</th><th>Ссылки</th></tr>${rows}</table>` : '<p class="muted">Пока пусто — добавьте первое заведение ниже.</p>'}
</div>
<div class="card">
  <h2>Добавить заведение</h2>
  <form method="post" action="/api/admin">
    <input type="hidden" name="action" value="create">
    ${venueForm()}
    <button class="btn" type="submit">Создать</button>
  </form>
</div>`;
  return layout({ title: 'Bagala — админка', body, wide: true });
}

function venueFields(b) {
  const threshold = [3, 4, 5].includes(Number(b.threshold)) ? Number(b.threshold) : 4;
  return {
    name: clip(b.name, 80),
    gis_url: safeUrl(b.gis_url) || null,
    google_url: safeUrl(b.google_url) || null,
    logo_url: safeUrl(b.logo_url) || null,
    owner_lang: b.owner_lang === 'kk' ? 'kk' : 'ru',
    threshold,
    notify_all: !!b.notify_all,
  };
}

async function uniqueSlug(name) {
  const base = slugify(name);
  if (!(await db.venueBySlug(base))) return base;
  for (let i = 0; i < 5; i++) {
    const s = `${base}-${token(2)}`;
    if (!(await db.venueBySlug(s))) return s;
  }
  return `${base}-${token(4)}`;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const b = await getBody(req);
      if (b.action === 'login') {
        if (!checkPassword(b.password)) return html(res, 401, loginPage('Неверный пароль'));
        return redirect(res, '/admin', { 'Set-Cookie': loginCookie(req) });
      }
      if (!isAdmin(req)) return html(res, 401, loginPage());
      if (b.action === 'logout') return redirect(res, '/admin', { 'Set-Cookie': logoutCookie() });

      if (b.action === 'create') {
        const f = venueFields(b);
        if (!f.name) return redirect(res, back('Укажите название', '&err=1'));
        const v = await db.createVenue({ ...f, slug: await uniqueSlug(f.name), owner_token: token(16), tg_link_code: token(8), active: true });
        return redirect(res, back(`Заведение «${v.name}» создано`, `&edit=${v.id}#edit`));
      }
      if (b.action === 'update') {
        const v = await db.venueById(String(b.id || ''));
        if (!v) return redirect(res, back('Заведение не найдено', '&err=1'));
        const f = venueFields(b);
        if (!f.name) return redirect(res, back('Укажите название', `&err=1&edit=${v.id}`));
        const patch = { ...f, active: !!b.active };
        if (b.reset_tg) { patch.tg_chat_id = null; patch.tg_link_code = token(8); }
        if (b.reset_token) patch.owner_token = token(16);
        await db.updateVenue(v.id, patch);
        return redirect(res, back('Сохранено', `&edit=${v.id}#edit`));
      }
      if (b.action === 'setwebhook') {
        const payload = { url: `${baseUrl(req)}/api/telegram`, allowed_updates: ['message'] };
        if (cfg.webhookSecret) payload.secret_token = cfg.webhookSecret;
        const r = await tgCall('setWebhook', payload);
        return redirect(res, r.ok ? back('Вебхук подключён ✅ Бот готов') : back(`Ошибка Telegram: ${r.description || 'неизвестно'}`, '&err=1'));
      }
      return redirect(res, '/admin');
    }

    if (!isAdmin(req)) return html(res, 200, loginPage());
    html(res, 200, await panel(req, getQuery(req)));
  } catch (e) {
    console.error(e);
    html(res, 500, layout({ title: 'Ошибка', body: `<div class="card"><h1>Ошибка</h1><p class="muted">${esc(e.message)}</p><a href="/admin">Назад</a></div>` }));
  }
}
