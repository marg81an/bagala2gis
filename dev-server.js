// Локальный запуск без установки пакетов: npm run dev → http://localhost:3000
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Загружаем .env, если он есть
if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
if (!process.env.ADMIN_PASSWORD) process.env.ADMIN_PASSWORD = 'admin';

// Те же правила, что и в vercel.json
const REWRITES = [
  [/^\/r\/([^/]+)$/, (m) => ['rate', { slug: m[1] }]],
  [/^\/d\/([^/]+)$/, (m) => ['dashboard', { token: m[1] }]],
  [/^\/admin\/print\/([^/]+)$/, (m) => ['print', { slug: m[1] }]],
  [/^\/admin\/?$/, () => ['admin', {}]],
  [/^\/api\/([a-z-]+)$/, (m) => [m[1], {}]],
];
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  for (const [re, fn] of REWRITES) {
    const m = u.pathname.match(re);
    if (!m) continue;
    const [name, params] = fn(m.map((x) => (x ? decodeURIComponent(x) : x)));
    const file = path.join(process.cwd(), 'api', `${name}.js`);
    if (!fs.existsSync(file)) break;
    req.query = { ...Object.fromEntries(u.searchParams), ...params };
    try {
      const mod = await import(pathToFileURL(file).href);
      return await mod.default(req, res);
    } catch (e) {
      console.error(e); res.statusCode = 500; return res.end('Server error');
    }
  }
  const p = path.join(process.cwd(), 'public', u.pathname === '/' ? 'index.html' : path.normalize(u.pathname));
  if (p.startsWith(path.join(process.cwd(), 'public')) && fs.existsSync(p) && fs.statSync(p).isFile()) {
    res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream');
    return fs.createReadStream(p).pipe(res);
  }
  res.statusCode = 404; res.end('Not found');
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => {
  console.log(`\n  Bagala запущен: http://localhost:${port}`);
  console.log(`  Админка:        http://localhost:${port}/admin  (пароль: ${process.env.ADMIN_PASSWORD === 'admin' ? 'admin' : 'из .env'})\n`);
});
