import { defineConfig } from '@playwright/test';
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
export default defineConfig({
  testDir: './tests/browser',
  use: {trace: 'retain-on-failure', screenshot: 'only-on-failure', baseURL: `http://127.0.0.1:4173${basePath}/`, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome'},
  webServer: {command: 'npm run preview -- --port 4173', url: `http://127.0.0.1:4173${basePath}/`, reuseExistingServer: false},
  projects: [
    {name: 'desktop', use: {viewport: {width: 1440, height: 1000}}},
    {name: 'mobile-dashboard', grep: /dashboard URL/, use: {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}},
  ],
});
