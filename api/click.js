// POST /api/click — гость нажал «оставить отзыв в 2ГИС/Google»
import { db } from '../lib/db.js';
import { getBody, json } from '../lib/http.js';
import { isUuid } from '../lib/util.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false });
  try {
    const b = await getBody(req);
    if (!isUuid(b.id) || !['2gis', 'google'].includes(b.target)) return json(res, 400, { ok: false });
    await db.markClicked(b.id, b.target);
    json(res, 200, { ok: true });
  } catch (e) {
    console.error(e);
    json(res, 500, { ok: false });
  }
}
