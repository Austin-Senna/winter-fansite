import { defineConfig } from 'astro/config';

const repo = 'winter-fansite';
const isPages = process.env.GITHUB_ACTIONS === 'true' && !process.env.CUSTOM_DOMAIN;

export default defineConfig({
  site: process.env.SITE_URL || 'https://austin-senna.github.io',
  base: isPages ? `/${repo}` : '/',
  output: 'static',
  trailingSlash: 'always',
  image: { domains: ['i.pinimg.com', 'i.ytimg.com', 'upload.wikimedia.org'] },
  build: { inlineStylesheets: 'auto' },
});
