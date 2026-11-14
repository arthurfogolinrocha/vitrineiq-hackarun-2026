import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (!normalized.includes('/node_modules/')) return undefined;
          if (normalized.includes('/node_modules/three/examples/jsm/')) {
            return 'vendor-three-addons';
          }
          if (normalized.includes('/node_modules/three/build/three.core')) {
            return 'vendor-three-core';
          }
          if (normalized.includes('/node_modules/three/')) {
            return 'vendor-three-renderer';
          }
          if (
            normalized.includes('/node_modules/react/') ||
            normalized.includes('/node_modules/react-dom/') ||
            normalized.includes('/node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }
          if (normalized.includes('/node_modules/lucide-react/')) {
            return 'vendor-icons';
          }
          if (normalized.includes('/node_modules/qrcode/')) {
            return 'vendor-qr';
          }
          return undefined;
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

