import { cfg } from './config.js';
import { TG, normLang } from './i18n.js';
import { starsText, fmtDate } from './util.js';
import { esc } from './html.js';

export async function tgCall(method, payload) {
  if (!cfg.botToken) { console.log(`[telegram:${method}] (нет токена)`, JSON.stringify(payload)); return { ok: false, description: 'no token' }; }
  const r = await fetch(`https://api.telegram.org/bot${cfg.botToken}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  return r.json();
}

export const tgSend = (chatId, text) =>
  tgCall('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true });

export function reviewMessage(venue, review) {
  const lang = normLang(venue.owner_lang);
  const t = TG[lang];
  const isLow = review.rating < (venue.threshold || 4);
  const lines = [
    `<b>${isLow ? t.low : t.new}</b>  ${starsText(review.rating)} (${review.rating}/5)`,
    `🏪 ${t.venue}: ${esc(venue.name)}`,
  ];
  if (review.staff) lines.push(`👤 ${t.staff}: ${esc(review.staff)}`);
  lines.push(`💬 ${t.comment}: ${review.comment ? esc(review.comment) : `<i>${t.no_comment}</i>`}`);
  if (review.contact) lines.push(`📞 ${t.contact}: ${esc(review.contact)}`);
  lines.push(`🕒 ${fmtDate(review.created_at || new Date().toISOString(), lang)}`);
  return lines.join('\n');
}
