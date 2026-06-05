import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.tsx'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  outExtension: () => ({ js: '.js' }),
  clean: true,
  splitting: false,
  sourcemap: false,
  shims: false,
})
