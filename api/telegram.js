// POST /api/telegram — вебхук бота: подключение чата владельца и команда /stats
import { db } from '../lib/db.js';
import { getBody, json } from '../lib/http.js';
import { cfg } from '../lib/config.js';
import { TG, normLang } from '../lib/i18n.js';
import { tgSend } from '../lib/telegram.js';
import { computeStats } from '../lib/util.js';
import { esc } from '../lib/html.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 200, { ok: true });
  if (cfg.webhookSecret && req.headers['x-telegram-bot-api-secret-token'] !== cfg.webhookSecret) {
    return json(res, 401, { ok: false });
  }
  try {
    const update = await getBody(req);
    const msg = update.message || update.channel_post;
    const text = String(msg?.text || '').trim();
    const chatId = msg?.chat?.id;
    if (!chatId || !text.startsWith('/')) return json(res, 200, { ok: true });

    const start = text.match(/^\/start(?:@\w+)?(?:\s+([A-Za-z0-9_-]+))?/);
    if (start) {
      const code = start[1];
      if (!code) { await tgSend(chatId, TG.ru.help + '\n\n' + TG.kk.help); return json(res, 200, { ok: true }); }
      const venue = await db.venueByLinkCode(code);
      if (!venue) { await tgSend(chatId, TG.ru.bad_code + '\n\n' + TG.kk.bad_code); return json(res, 200, { ok: true }); }
      await db.updateVenue(venue.id, { tg_chat_id: chatId });
      await tgSend(chatId, TG[normLang(venue.owner_lang)].linked(esc(venue.name)));
      return json(res, 200, { ok: true });
    }

    if (/^\/stats(@\w+)?$/.test(text)) {
      const venue = await db.venueByChatId(chatId);
      if (!venue) { await tgSend(chatId, TG.ru.not_linked + '\n\n' + TG.kk.not_linked); return json(res, 200, { ok: true }); }
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const s = computeStats(await db.listReviews(venue.id, since), venue.threshold || 4);
      await tgSend(chatId, TG[normLang(venue.owner_lang)].stats(esc(venue.name), s));
      return json(res, 200, { ok: true });
    }
    json(res, 200, { ok: true });
  } catch (e) {
    console.error(e);
    json(res, 200, { ok: true }); // всегда 200, чтобы Telegram не повторял запрос бесконечно
  }
}
