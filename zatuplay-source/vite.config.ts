import {defineConfig} from 'vite';
import {fileURLToPath,URL} from 'node:url';

export default defineConfig({
  base: '/game-no-mori/zatuplay/',
  resolve: {alias: {'@': fileURLToPath(new URL('./src',import.meta.url))}},
  build: {outDir: 'dist',emptyOutDir: true,rolldownOptions:{input:{home:'index.html',apk:'apk/index.html',browser:'browser/index.html'}}},
});
