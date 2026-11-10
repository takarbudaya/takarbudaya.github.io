import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/**
 * GitHub Pages has no SPA rewrite rules: opening /some-page directly returns 404.html.
 * Copying index.html to 404.html makes Pages serve the app for any path, and
 * vue-router then renders the right page.
 */
function githubPagesSpaFallback() {
  let outDir;
  return {
    name: 'github-pages-spa-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'));
    }
  };
}

// takarbudaya.github.io is a GitHub Pages user site, served from the domain root.
export default defineConfig({
  plugins: [vue(), githubPagesSpaFallback()],
  base: '/',
  build: {
    // ExcelJS (~940 kB, ~270 kB gzip) is only loaded on demand when the user clicks "Export Excel",
    // so its size never affects the initial page load. Raise the warning limit to fit that lazy chunk.
    chunkSizeWarningLimit: 1000
  }
});
