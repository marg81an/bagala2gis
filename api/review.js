// POST /api/review — сохранить оценку гостя и уведомить владельца в Telegram
import { db } from '../lib/db.js';
import { getBody, json, clip } from '../lib/http.js';
import { normLang } from '../lib/i18n.js';
import { tgSend, reviewMessage } from '../lib/telegram.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false });
  try {
    const b = await getBody(req);
    if (b.website) return json(res, 200, { ok: true }); // ловушка для ботов
    const rating = Number(b.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json(res, 400, { ok: false, error: 'rating' });
    const venue = await db.venueBySlug(clip(b.slug, 80));
    if (!venue || !venue.active) return json(res, 404, { ok: false, error: 'venue' });

    const review = await db.insertReview({
      venue_id: venue.id,
      rating,
      comment: clip(b.comment, 1000) || null,
      contact: clip(b.contact, 100) || null,
      staff: clip(b.staff, 60) || null,
      lang: normLang(b.lang),
      clicked: ['2gis', 'google'].includes(b.clicked) && rating >= (venue.threshold || 4) ? b.clicked : null,
    });

    const isLow = rating < (venue.threshold || 4);
    if (venue.tg_chat_id && (isLow || venue.notify_all)) {
      try { await tgSend(venue.tg_chat_id, reviewMessage(venue, review)); } catch (e) { console.error('telegram', e); }
    }
    json(res, 200, { ok: true, id: review.id });
  } catch (e) {
    console.error(e);
    json(res, 500, { ok: false });
  }
}
