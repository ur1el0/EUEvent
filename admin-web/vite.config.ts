import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Allow Cloudflare quick-tunnel addresses (scripts/start-tunnels.sh) to open the dev server.
      allowedHosts: ['.trycloudflare.com'],
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_ORIGIN || 'https://backend.test',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
