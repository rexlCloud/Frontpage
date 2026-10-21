// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import remarkSite from './src/lib/remark-site.mjs';

export default defineConfig({
  site: 'https://rexlcloud.de',
  trailingSlash: 'ignore',
  i18n: {
    locales: ['en', 'de'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', de: 'de' } },
    }),
  ],
  redirects: {
    '/docs': '/docs/installation',
    '/de/docs': '/de/docs/installation',
  },
  markdown: {
    // unified (remark) instead of the default Sätteri processor, for the remark plugin
    processor: unified({ remarkPlugins: [remarkSite] }),
    shikiConfig: { theme: 'github-dark-default', wrap: false },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
