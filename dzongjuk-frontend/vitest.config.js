/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:5000'
      }
    },
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{spec,test}.{js,jsx,ts,tsx}', 'src/**/*.contract.test.js'],
    testTimeout: 10000,
  },
});
