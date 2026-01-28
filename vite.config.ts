
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Removed 'path' alias usage to avoid need for @types/node
    // Default resolution works fine for this flat structure
    alias: {
      '@': '/src', 
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    sourcemap: false
  },
  server: {
    port: 3000,
    host: true
  }
});
