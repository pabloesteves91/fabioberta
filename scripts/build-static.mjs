/**
 * Baut eine statische Testversion der Website für GitHub Pages.
 *
 * Ablauf: Server-Build (Node-Adapter) → Server lokal starten → alle Seiten aus der Sitemap
 * plus Admin abrufen → Links relativ machen → Ordner dist-static/.
 * Inhalte stammen aus Firebase (Stand beim Build) bzw. den Standardinhalten.
 *
 * In dieser Testversion funktionieren Kontaktformular und Shop-Kasse nicht (kein Server);
 * die Seiten sind für Google gesperrt (noindex), damit es keine Doppelinhalte gibt.
 *
 * Verwendung: node scripts/build-static.mjs
 */
import { spawn, execSync } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { cpSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const OUT = path.join(root, 'dist-static');
const PORT = 4399;
const ORIGIN = `http://127.0.0.1:${PORT}`;

console.log('1/3 Server-Build …');
execSync('npx astro build --config astro.static.config.mjs', { cwd: root, stdio: 'inherit' });

console.log('2/3 Seiten abrufen …');
const server = spawn('node', ['entry.mjs'], {
  cwd: path.join(root, '.static-build/server'),
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(PORT) },
  stdio: ['ignore', 'inherit', 'inherit'],
});
const stop = () => server.kill('SIGTERM');
process.on('exit', stop);

for (let i = 0; ; i++) {
  try {
    if ((await fetch(ORIGIN + '/robots.txt')).ok) break;
  } catch {}
  if (i > 60) throw new Error('Server startet nicht');
  await new Promise((r) => setTimeout(r, 500));
}

await rm(OUT, { recursive: true, force: true });
const sitemap = await (await fetch(ORIGIN + '/sitemap.xml')).text();
const pages = [...new Set([...sitemap.matchAll(/<loc>https:\/\/fabioberta\.com([^<]*)<\/loc>/g)].map((m) => m[1] || '/')), '/admin'];
const pageFile = (route) => (route === '/' ? 'index.html' : route.replace(/^\//, '') + '.html');
const isPage = new Set(pages);
const assets = new Set();
const rel = (from, to) => path.posix.relative(path.posix.dirname(from), to) || path.posix.basename(to);

function mapUrl(fromFile, url) {
  if (!url.startsWith('/') || url.startsWith('//')) return url;
  const [p, rest = ''] = url.split(/(?=[?#])/);
  const clean = p.replace(/\/$/, '') || '/';
  if (isPage.has(clean)) return rel(fromFile, pageFile(clean)) + rest;
  if (/\.[a-z0-9]+$/i.test(clean)) {
    assets.add(clean);
    return rel(fromFile, clean.slice(1)) + rest;
  }
  return url; // Server-Routen (API) – in der Testversion nicht verfügbar
}

const marker = '<meta name="robots" content="noindex, nofollow"><meta name="fb-static" content="1">';
function rewrite(file, html) {
  html = html.replace(/(\s(?:href|src|data-full)=")([^"]*)"/g, (m, a, v) => `${a}${mapUrl(file, v)}"`);
  html = html.replace(/(\ssrcset=")([^"]*)"/g, (m, a, v) =>
    `${a}${v.split(',').map((part) => { const [u, ...d] = part.trim().split(/\s+/); return [mapUrl(file, u), ...d].join(' '); }).join(', ')}"`);
  html = html.replace(/url\((['"]?)(\/[^)'"]+)\1\)/g, (m, q, u) => `url(${q}${mapUrl(file, u)}${q})`);
  return html.replace(/<head>/, `<head>${marker}`);
}

const queue = [...pages];
await Promise.all(Array.from({ length: 8 }, async () => {
  while (queue.length) {
    const route = queue.shift();
    const file = pageFile(route);
    const res = await fetch(ORIGIN + route);
    if (!res.ok) throw new Error(`${route}: ${res.status}`);
    await mkdir(path.join(OUT, path.dirname(file)), { recursive: true });
    await writeFile(path.join(OUT, file), rewrite(file, await res.text()));
  }
}));

// 404-Seite (wird von GitHub Pages für jede unbekannte Adresse gezeigt → Links auf die Startseite absolut)
{
  const html = await (await fetch(ORIGIN + '/diese-seite-gibt-es-nicht')).text();
  const base = process.env.PAGES_BASE || '/';
  await writeFile(path.join(OUT, '404.html'), rewrite('404.html', html).replace(/(href|src)="(?!https?:|#|\/\/)([^"]+)"/g, (m, a, v) => `${a}="${base}${v}"`));
}

console.log('3/3 Dateien kopieren …');
const done = new Set();
while ([...assets].some((a) => !done.has(a))) {
  for (const a of [...assets]) {
    if (done.has(a)) continue;
    done.add(a);
    const res = await fetch(ORIGIN + a);
    if (!res.ok) { console.warn('fehlt:', a, res.status); continue; }
    const file = a.slice(1);
    await mkdir(path.join(OUT, path.dirname(file)), { recursive: true });
    if (/\.(css|js|mjs)$/.test(a)) {
      let txt = await res.text();
      txt = txt.replace(/url\((['"]?)(\/[^)'"]+)\1\)/g, (m, q, u) => `url(${q}${mapUrl(file, u)}${q})`);
      txt = txt.replace(/(["'])(\/_astro\/[^"']+)\1/g, (m, q, u) => `${q}${mapUrl(file, u)}${q}`);
      for (const m of txt.matchAll(/(?:from|import)\s*\(?\s*["'](\.\/[^"']+)["']/g)) assets.add(path.posix.join(path.posix.dirname(a), m[1]));
      await writeFile(path.join(OUT, file), txt);
    } else {
      await writeFile(path.join(OUT, file), Buffer.from(await res.arrayBuffer()));
    }
  }
}
// Bilder aus public/photos, die das Admin beim «Inhalte übernehmen» referenziert, vollständig mitnehmen
cpSync(path.join(root, 'public/photos'), path.join(OUT, 'photos'), { recursive: true, force: false });
await writeFile(path.join(OUT, '.nojekyll'), ''); // sonst ignoriert GitHub Pages den Ordner _astro
await writeFile(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

stop();
console.log(`Fertig: ${pages.length} Seiten in dist-static/`);
process.exit(0);
