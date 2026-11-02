import type { APIRoute } from 'astro';
import { site } from '../lib/site';

export const GET: APIRoute = () =>
  new Response(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /shop/danke
Disallow: /en/shop/thank-you

Sitemap: ${site.url}/sitemap.xml
`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
