import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  server: { port: 3000, host: '0.0.0.0' },
  plugins: [react(), tsconfigPaths()],
});
