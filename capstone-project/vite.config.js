import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    cssMinify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf')) return 'vendor-pdf';
            if (id.includes('leaflet') || id.includes('mapbox')) return 'vendor-maps';
            if (id.includes('chart') || id.includes('recharts')) return 'vendor-charts';
            return 'vendor';
          }
        },
      },
    },
  },
});