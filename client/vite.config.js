import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Read the shared .env file from the project root (one folder up).
  // Only variables that start with VITE_ are ever sent to the browser.
  envDir: '..',

  server: {
    port: 5173,
    // Fail loudly if 5173 is busy instead of silently moving to 5174,
    // because the backend only accepts requests from the origin listed in CLIENT_ORIGIN.
    strictPort: true,
  },
});
