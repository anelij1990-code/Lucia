import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', workers: 1, timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:5173/Lucia/', viewport: { width: 900, height: 650 },
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  webServer: { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://127.0.0.1:5173/Lucia/', reuseExistingServer: !process.env.CI },
});
