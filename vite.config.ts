import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Use relative paths for assets so it works on any subdirectory (like GitHub Pages)
  build: {
    outDir: 'dist',
  }
});
