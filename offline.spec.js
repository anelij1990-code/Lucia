import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';

test('Ready-to-play HTML runs with internet disabled', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ offline: true, viewport: { width: 1200, height: 800 } });
  let page = await context.newPage();
  const errors = [], network = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url())) network.push(r.url()); });
  const filename = resolve('ready-to-play/Lucia-play.html');
  const html = await readFile(filename, 'utf8');
  expect(html).not.toMatch(/<(?:script|link)[^>]+(?:src|href)=["'](?:https?:|\/)/i);
  try {
    await page.goto(pathToFileURL(filename).href);
  } catch (error) {
    if (!String(error).includes('ERR_BLOCKED_BY_ADMINISTRATOR')) throw error;
    // Managed Chromium can forbid all file:// navigation. Keep offline testing
    // and execute the exact file contents, without disabling browser policies.
    testInfo.annotations.push({ type: 'environment-limitation', description: 'file:// blocked by managed Chromium; exact HTML tested offline with setContent' });
    console.log('Managed Chromium blocks file://; checking exact HTML contents offline.');
    await page.close();
    page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (/^https?:/.test(r.url())) network.push(r.url()); });
    await page.setContent(html, { waitUntil: 'load' });
  }
  await expect(page.locator('#play')).toBeVisible();
  await expect(page.locator('#play')).toHaveText('Играть ↗');
  expect(await page.locator('#world').evaluate(c => !!c.getContext('webgl2'))).toBe(true);
  await page.screenshot({ path: 'test-results/offline-menu.png' });
  await page.locator('#play').click();
  await page.keyboard.down('KeyW'); await page.keyboard.down('Shift');
  await page.waitForTimeout(1500);
  await page.keyboard.up('KeyW'); await page.keyboard.up('Shift');
  await expect(page.locator('#time')).not.toHaveText('3:00', { timeout: 20000 });
  await page.keyboard.press('Space');
  await page.screenshot({ path: 'test-results/offline-playing.png' });
  await page.keyboard.press('Escape'); await expect(page.locator('#overlay')).toBeVisible();
  expect(errors).toEqual([]); expect(network).toEqual([]);
  await context.close();
});
