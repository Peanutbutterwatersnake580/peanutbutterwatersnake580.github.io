import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const root = dirname(fileURLToPath(import.meta.url));

// iOS will not run a type="module" script opened from a file. The bundle is
// one inlined script with no imports, so a plain script tag runs it.
function classicInlineScript() {
  return {
    name: 'classic-inline-script',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type !== 'asset' || typeof item.source !== 'string') continue;
        if (!item.fileName.endsWith('.html')) continue;
        // defer does nothing on an inline script, so wait for the document.
        // The bundle sits in <head>, ahead of the Start button.
        item.source = item.source.replace(
          /<script type="module"(?: crossorigin)?>([\s\S]*?)<\/script>/,
          (_, code) => `<script>document.addEventListener('DOMContentLoaded',function(){${code}});</script>`,
        );
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [viteSingleFile(), classicInlineScript()],
  build: {
    rollupOptions: {
      input: resolve(root, 'index.html'),
    },
  },
  server: { port: 5173, strictPort: false },
});
