import type { APIRoute } from 'astro';
import { routes, photoUrl, eventUrl, type RouteKey } from '../i18n/routes';
import { getPhotos } from '../lib/photos';
import { getEvents, getPosts, getServices } from '../lib/data';
import { site } from '../lib/site';

type Entry = { de: string; en: string; priority: number; lastmod?: string; image?: string };

export const GET: APIRoute = async () => {
  const entries: Entry[] = [];
  const keys: [RouteKey, number][] = [
    ['home', 1], ['portfolio', 0.9], ['services', 0.9], ['shop', 0.8], ['contact', 0.8], ['about', 0.7],
    ['events', 0.6], ['exhibitions', 0.5], ['journal', 0.6], ['imprint', 0.1], ['privacy', 0.1], ['terms', 0.1],
  ];
  keys.forEach(([k, priority]) => entries.push({ ...routes[k], priority }));
  (await getServices()).filter((s) => s.id !== 'fine-art').forEach((s) =>
    entries.push({ de: `${routes.services.de}/${s.slug.de}`, en: `${routes.services.en}/${s.slug.en}`, priority: 0.9 }),
  );
  (await getEvents()).forEach((e) => entries.push({ de: eventUrl(e.slug, 'de'), en: eventUrl(e.slug, 'en'), priority: 0.5 }));
  (await getPhotos()).forEach((p) => entries.push({ de: photoUrl(p.slug, 'de'), en: photoUrl(p.slug, 'en'), priority: p.forSale ? 0.6 : 0.4, image: p.src }));

  const posts = await getPosts();
  const byKey = new Map<string, { de?: (typeof posts)[number]; en?: (typeof posts)[number] }>();
  posts.forEach((p) => byKey.set(p.translationKey, { ...byKey.get(p.translationKey), [p.lang]: p }));
  byKey.forEach((pair) => {
    const de = pair.de ? `${routes.journal.de}/${pair.de.slug}` : routes.journal.de;
    const en = pair.en ? `${routes.journal.en}/${pair.en.slug}` : routes.journal.en;
    const lastmod = (pair.de ?? pair.en)!.date.toISOString().slice(0, 10);
    entries.push({ de, en, priority: 0.6, lastmod });
  });

  const u = (p: string) => new URL(p, site.url).toString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries
  .flatMap((e) =>
    (['de', 'en'] as const).map(
      (lang) => `  <url>
    <loc>${u(e[lang])}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}
    <priority>${lang === 'de' ? e.priority : Math.max(0.1, e.priority - 0.1).toFixed(1)}</priority>
    <xhtml:link rel="alternate" hreflang="de-CH" href="${u(e.de)}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${u(e.en)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${u(e.de)}"/>${e.image ? `\n    <image:image><image:loc>${u(e.image)}</image:loc></image:image>` : ''}
  </url>`,
    ),
  )
  .join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
