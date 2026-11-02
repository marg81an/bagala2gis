export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function safeJson(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

const CSS = `
:root{--p:#4f46e5;--p2:#4338ca;--bg:#f5f6fb;--card:#fff;--text:#111827;--muted:#6b7280;--star:#f59e0b;--bad:#dc2626;--ok:#16a34a;--line:#e5e7eb;--gis:#1ba136}
*{box-sizing:border-box}
html,body{margin:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;background:var(--bg);color:var(--text);line-height:1.45;-webkit-font-smoothing:antialiased}
a{color:var(--p)}
.wrap{max-width:480px;margin:0 auto;padding:16px 16px 40px}
.wrap.wide{max-width:1040px}
.card{background:var(--card);border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 8px 24px rgba(17,24,39,.06);margin-bottom:16px}
h1{font-size:24px;line-height:1.25;margin:0 0 6px}
h2{font-size:18px;margin:0 0 12px}
p{margin:0 0 10px}
.muted{color:var(--muted)}
.small{font-size:13px}
.center{text-align:center}
.hidden{display:none!important}
.btn{display:block;width:100%;padding:14px 16px;border:0;border-radius:12px;background:var(--p);color:#fff;font:inherit;font-size:16px;font-weight:600;text-align:center;text-decoration:none;cursor:pointer;margin-top:10px}
.btn:hover{background:var(--p2)}
.btn.secondary{background:#eef2ff;color:var(--p2)}
.btn.ghost{background:transparent;color:var(--muted);font-weight:500}
.btn.gis{background:var(--gis)}
.btn.google{background:#fff;color:#1f2937;border:1px solid var(--line)}
.btn.inline{display:inline-block;width:auto;padding:10px 14px;font-size:14px;margin:0}
label{display:block;font-size:14px;font-weight:600;margin-top:12px}
input,textarea,select{width:100%;padding:12px;border:1px solid var(--line);border-radius:10px;font:inherit;font-size:16px;background:#fff;margin-top:6px;color:var(--text)}
input[type=checkbox]{width:auto;margin:0 8px 0 0;vertical-align:middle}
.check{font-weight:500;display:flex;align-items:center}
textarea{min-height:110px;resize:vertical}
.top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px}
.brand{font-weight:800;letter-spacing:.2px;color:var(--p2);text-decoration:none}
.lang{display:flex;gap:4px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:3px}
.lang a,.lang button{border:0;background:transparent;padding:5px 11px;border-radius:999px;font:inherit;font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;text-decoration:none}
.lang .on{background:var(--p);color:#fff}
.logo{width:76px;height:76px;border-radius:18px;object-fit:cover;display:block;margin:4px auto 14px;background:#fff}
.stars{display:flex;justify-content:center;gap:4px;margin:20px 0 4px}
.star{font-size:48px;background:none;border:0;cursor:pointer;color:#d1d5db;padding:0 2px;line-height:1;transition:transform .12s,color .12s}
.star.on{color:var(--star)}
.star:active{transform:scale(1.18)}
.hint{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);padding:0 14px}
.footer{text-align:center;font-size:12px;color:#9ca3af;margin-top:18px}
.flash{padding:12px 14px;border-radius:10px;background:#ecfdf5;color:#065f46;margin-bottom:14px}
.flash.err{background:#fef2f2;color:#991b1b}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.stat{background:var(--card);border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 8px 24px rgba(17,24,39,.05)}
.stat .v{font-size:28px;font-weight:800}
.stat .l{color:var(--muted);font-size:13px}
.row{display:flex;align-items:center;gap:10px;margin:6px 0;font-size:14px}
.row .k{width:44px;color:var(--muted)}
.row .n{width:36px;text-align:right;color:var(--muted)}
.bar{flex:1;height:10px;background:#f1f2f6;border-radius:6px;overflow:hidden}
.bar>span{display:block;height:100%;background:var(--star);border-radius:6px}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);font-size:14px;vertical-align:top}
th{color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.3px}
.pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:600;background:#f3f4f6;white-space:nowrap}
.pill.bad{background:#fef2f2;color:var(--bad)}
.pill.good{background:#ecfdf5;color:var(--ok)}
.tabs{display:flex;gap:6px;flex-wrap:wrap}
.tabs a{padding:7px 12px;border-radius:999px;background:#fff;border:1px solid var(--line);text-decoration:none;color:var(--text);font-size:14px}
.tabs a.on{background:var(--p);border-color:var(--p);color:#fff}
.links a{margin-right:12px;white-space:nowrap}
.scroll{overflow-x:auto}
code{background:#f3f4f6;padding:2px 6px;border-radius:6px;font-size:13px;word-break:break-all}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media (max-width:640px){.two{grid-template-columns:1fr}}
`;

export function layout({ title, body, lang = 'ru', head = '', wide = false }) {
  return `<!doctype html>
<html lang="${lang === 'kk' ? 'kk' : 'ru'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>${CSS}</style>
${head}
</head>
<body>
<div class="wrap${wide ? ' wide' : ''}">
${body}
</div>
</body>
</html>`;
}

export function notFoundPage(lang = 'ru') {
  const t = lang === 'kk' ? 'Бет табылмады' : 'Страница не найдена';
  return layout({ title: t, lang, body: `<div class="card center"><h1>🤷 ${t}</h1><p class="muted">Bagala</p></div>` });
}
