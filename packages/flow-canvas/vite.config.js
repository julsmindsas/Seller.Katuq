import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Build target: single ESM bundle that defines the
 * <katuq-flow-canvas> custom element. React + ReactDOM are
 * inlined so the module can drop into Angular without a runtime peer.
 */
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, 'src/main.tsx'),
      name: 'KatuqFlowCanvas',
      formats: ['es'],
      fileName: () => 'flow-canvas.js'
    },
    rollupOptions: {
      // Inline everything — Angular shell does not own these deps.
      external: [],
      output: {
        inlineDynamicImports: true,
        assetFileNames: (chunkInfo) => {
          if (chunkInfo.name && chunkInfo.name.endsWith('.css')) {
            return 'flow-canvas.css';
          }
          return '[name][extname]';
        }
      }
    }
  },
  server: {
    port: 5180,
    open: '/dev.html'
  }
});
