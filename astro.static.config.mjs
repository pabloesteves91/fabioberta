// Build-Konfiguration für die Testversion auf GitHub Pages (siehe scripts/build-static.mjs)
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import base from './astro.config.mjs';

export default defineConfig({
  ...base,
  adapter: node({ mode: 'standalone' }),
  outDir: './.static-build',
  prefetch: false,
});
