import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/core/browser.ts', 'src/core/node.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  minify: true,
  clean: true,
  outDir: 'dist',
});
