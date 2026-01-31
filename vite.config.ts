import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        allowedHosts: ["quizly.omgrod.me"],
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true
          },
          '/socket.io': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            ws: true
          }
        }
      },
      plugins: [react()],
      build: {
        chunkSizeWarningLimit: 600,
        rollupOptions: {
          output: {
            format: 'es',
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('react')) return 'react-vendor';
                if (id.includes('socket.io-client')) return 'socket-vendor';
                if (id.includes('@google/genai')) return 'ai-vendor';
                return 'vendor';
              }
            }
          }
        }
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.')
        }
      }
    };
});
