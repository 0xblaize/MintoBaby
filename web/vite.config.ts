import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '');

  return {
    envDir: '..',
    define: {
      __MINTOBABY_CONFIG__: JSON.stringify({
        apiUrl: env.API_URL || 'http://localhost:8000',
        googleClientId: env.GOOGLE_CLIENT_ID || '',
        walletConnectProjectId: env.WALLETCONNECT_PROJECT_ID || '',
      }),
    },
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
});
