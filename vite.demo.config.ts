import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Builds the game with an in-browser backend into one HTML file. */
export default defineConfig({
  root: 'src/client/demo',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: '../../../dist/demo',
    emptyOutDir: true,
  },
});
