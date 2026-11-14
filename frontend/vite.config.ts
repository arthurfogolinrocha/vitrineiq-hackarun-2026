import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three': ['three'],
          'vendor-react': ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: false,
    host: true
  },
  test: {
    globals: true,
    environment: 'node'
  }
});

