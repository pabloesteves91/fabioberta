// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://fabioberta.com',
  output: 'server',
  trailingSlash: 'never',
  adapter: vercel({
    webAnalytics: { enabled: true },
    // Seiten werden gecacht und alle 5 Minuten neu erzeugt, damit neue Bilder aus Firebase ohne Rebuild erscheinen.
    isr: {
      expiration: 300,
      exclude: [/^\/api\/.*/, /^\/admin.*/, /^\/(en\/)?shop\/(danke|thank-you).*/],
    },
  }),
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  image: { domains: [] },
  redirects: {
    // Alte Adobe-Portfolio-URLs (SEO: Linkkraft erhalten)
    '/arbeit': '/portfolio',
    '/about-me': '/ueber-mich',
    '/contact': '/kontakt',
    '/snbf-2024': '/events/snbf-2024',
  },
  build: { inlineStylesheets: 'auto' },
  devToolbar: { enabled: false },
  // Testen in GitHub Codespaces (*.app.github.dev)
  server: { allowedHosts: ['.app.github.dev'] },
});
