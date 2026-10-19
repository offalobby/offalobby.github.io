// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// offalobby.github.io is a GitHub *user* site served from the domain root,
// and public/CNAME points it at offalobby.com, so `base` stays '/'.
// If this ever moves to a project repo (username.github.io/repo-name) without
// a custom domain, set `base: '/repo-name'` — every internal link and asset
// already goes through `import.meta.env.BASE_URL`, so nothing else changes.
export default defineConfig({
  site: 'https://offalobby.com',
  base: '/',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    // /projects/foo/index.html → works on GitHub Pages with or without trailing slash
    format: 'directory',
  },
  integrations: [react()],
  vite: {
    build: {
      // three.js is one large chunk by nature; don't nag about it
      chunkSizeWarningLimit: 900,
    },
  },
});
