// GET /r/:slug — страница, которую видит гость после сканирования QR
import { db } from '../lib/db.js';
import { getQuery, html, clip } from '../lib/http.js';
import { layout, esc, safeJson, notFoundPage } from '../lib/html.js';
import { RATE, normLang } from '../lib/i18n.js';

export default async function handler(req, res) {
  const q = getQuery(req);
  let venue = null;
  try { venue = q.slug ? await db.venueBySlug(String(q.slug)) : null; } catch (e) { console.error(e); }
  if (!venue || !venue.active) return html(res, 404, notFoundPage(normLang(q.lang)));

  const data = {
    slug: venue.slug,
    staff: clip(q.s, 60) || null,
    gis: venue.gis_url || null,
    google: venue.google_url || null,
    threshold: venue.threshold || 4,
    forcedLang: q.lang ? normLang(q.lang) : null,
    i18n: RATE,
  };
  const t = RATE.ru;
  const stars = [1, 2, 3, 4, 5].map((n) => `<button class="star" type="button" data-v="${n}" aria-label="${n}">★</button>`).join('');
  const publicLinks = (extraClass = '') => `
    ${venue.gis_url ? `<a class="btn gis ${extraClass}" data-track="2gis" href="${esc(venue.gis_url)}" data-i18n="btn_2gis">${t.btn_2gis}</a>` : ''}
    ${venue.google_url ? `<a class="btn google ${extraClass}" data-track="google" href="${esc(venue.google_url)}" data-i18n="btn_google">${t.btn_google}</a>` : ''}`;

  const body = `
<div class="top">
  <span class="brand small">${esc(venue.name)}</span>
  <div class="lang"><button type="button" data-lang="ru" class="on">RU</button><button type="button" data-lang="kk">ҚАЗ</button></div>
</div>
<div class="card center" id="s-rate">
  ${venue.logo_url ? `<img class="logo" src="${esc(venue.logo_url)}" alt="">` : ''}
  <h1 data-i18n="title">${t.title}</h1>
  <p class="muted" data-i18n="subtitle">${t.subtitle}</p>
  <div class="stars" id="stars">${stars}</div>
  <div class="hint"><span data-i18n="bad">${t.bad}</span><span data-i18n="great">${t.great}</span></div>
</div>

<div class="card center hidden" id="s-high">
  <div style="font-size:52px">🎉</div>
  <h1 data-i18n="high_title">${t.high_title}</h1>
  ${venue.gis_url || venue.google_url ? `<p class="muted" data-i18n="${venue.gis_url ? 'high_sub' : 'high_sub_google'}">${venue.gis_url ? t.high_sub : t.high_sub_google}</p>` : ''}
  ${publicLinks()}
</div>

<div class="card hidden" id="s-low">
  <h1 data-i18n="low_title">${t.low_title}</h1>
  <p class="muted" data-i18n="low_sub">${t.low_sub}</p>
  <form id="low-form">
    <textarea name="comment" maxlength="1000" data-i18n-ph="comment_ph" placeholder="${t.comment_ph}"></textarea>
    <input name="contact" maxlength="100" data-i18n-ph="contact_ph" placeholder="${t.contact_ph}" autocomplete="tel">
    <input name="website" class="hidden" tabindex="-1" autocomplete="off">
    <button class="btn" type="submit" data-i18n="send">${t.send}</button>
    <button class="btn ghost" type="button" id="skip" data-i18n="skip">${t.skip}</button>
  </form>
  <p class="err-msg hidden" style="color:#dc2626" data-i18n="error">${t.error}</p>
</div>

<div class="card center hidden" id="s-sent">
  <div style="font-size:52px">🙏</div>
  <h1 data-i18n="sent_title">${t.sent_title}</h1>
  <p class="muted" data-i18n="sent_sub">${t.sent_sub}</p>
</div>

${venue.gis_url || venue.google_url ? `
<div class="center small muted hidden" id="also">
  <p data-i18n="also_public">${t.also_public}</p>
  <p>${venue.gis_url ? `<a data-track="2gis" href="${esc(venue.gis_url)}">2ГИС</a>` : ''}${venue.gis_url && venue.google_url ? ' · ' : ''}${venue.google_url ? `<a data-track="google" href="${esc(venue.google_url)}">Google</a>` : ''}</p>
</div>` : ''}

<div class="footer" data-i18n="powered">${t.powered}</div>

<script>
(function(){
  var D = ${safeJson(data)};
  var lang = D.forcedLang || localStorage.getItem('bagala_lang') ||
    ((navigator.language || '').toLowerCase().indexOf('kk') === 0 ? 'kk' : 'ru');
  var rating = 0, reviewId = null, busy = false;
  var $ = function(s){ return document.querySelector(s); };
  var $$ = function(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); };

  function applyLang(l){
    lang = l; localStorage.setItem('bagala_lang', l);
    document.documentElement.lang = l;
    var T = D.i18n[l];
    $$('[data-i18n]').forEach(function(el){ var k = el.getAttribute('data-i18n'); if (T[k]) el.textContent = T[k]; });
    $$('[data-i18n-ph]').forEach(function(el){ var k = el.getAttribute('data-i18n-ph'); if (T[k]) el.placeholder = T[k]; });
    $$('[data-lang]').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-lang') === l); });
  }
  function show(id){
    ['s-rate','s-high','s-low','s-sent'].forEach(function(s){ $('#'+s).classList.toggle('hidden', s !== id); });
    var also = $('#also'); if (also) also.classList.toggle('hidden', !(id === 's-low' || id === 's-sent'));
    window.scrollTo(0, 0);
  }
  function submit(extra){
    var body = { slug: D.slug, rating: rating, staff: D.staff, lang: lang };
    for (var k in extra) body[k] = extra[k];
    return fetch('/api/review', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function(r){ if (!r.ok) throw new Error('bad'); return r.json(); })
      .then(function(j){ reviewId = j.id || null; return j; });
  }

  $$('[data-lang]').forEach(function(b){ b.addEventListener('click', function(){ applyLang(b.getAttribute('data-lang')); }); });

  $$('.star').forEach(function(btn){
    btn.addEventListener('mouseenter', function(){ var v = +btn.getAttribute('data-v'); $$('.star').forEach(function(s){ s.classList.toggle('on', +s.getAttribute('data-v') <= v); }); });
    btn.addEventListener('click', function(){
      if (busy) return;
      rating = +btn.getAttribute('data-v');
      $$('.star').forEach(function(s){ s.classList.toggle('on', +s.getAttribute('data-v') <= rating); });
      setTimeout(function(){
        if (rating >= D.threshold) {
          busy = true;
          var target = D.gis ? '2gis' : (D.google ? 'google' : null);
          if (!target) { show('s-high'); submit({}).catch(function(){}); return; }
          // Сразу перекидываем на отзывы: сохраняем оценку и уходим, не дольше 1 секунды ожидания
          var go = function(){ if (go.done) return; go.done = true; location.href = target === '2gis' ? D.gis : D.google; };
          show('s-high');
          submit({ clicked: target }).then(go, go);
          setTimeout(go, 1000);
        }
        else { show('s-low'); var ta = document.querySelector('#low-form textarea'); if (ta) ta.focus(); }
      }, 250);
    });
  });
  $('#stars').addEventListener('mouseleave', function(){ $$('.star').forEach(function(s){ s.classList.toggle('on', +s.getAttribute('data-v') <= rating); }); });

  function sendLow(withText){
    if (busy) return; busy = true;
    var f = $('#low-form');
    var extra = withText ? { comment: f.comment.value, contact: f.contact.value, website: f.website.value } : { website: f.website.value };
    $('.err-msg').classList.add('hidden');
    submit(extra).then(function(){ show('s-sent'); })
      .catch(function(){ busy = false; $('.err-msg').classList.remove('hidden'); });
  }
  $('#low-form').addEventListener('submit', function(e){ e.preventDefault(); sendLow(true); });
  $('#skip').addEventListener('click', function(){ sendLow(false); });

  $$('[data-track]').forEach(function(a){
    a.addEventListener('click', function(){
      if (!reviewId) return;
      try {
        fetch('/api/click', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: reviewId, target: a.getAttribute('data-track') }) });
      } catch (e) {}
    });
  });

  applyLang(lang === 'kk' ? 'kk' : 'ru');
})();
</script>`;

  html(res, 200, layout({ title: venue.name, body, head: '<meta name="theme-color" content="#f5f6fb">' }));
}
