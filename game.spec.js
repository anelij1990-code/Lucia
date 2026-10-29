import { test, expect } from '@playwright/test';

test('Start, pause, resume, reset and timer', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('./'); await page.locator('#play').click();
  await expect(page.locator('#overlay')).toBeHidden();
  await page.keyboard.press('Escape');
  const time = await page.locator('#time').textContent();
  await page.waitForTimeout(300); await expect(page.locator('#time')).toHaveText(time);
  await page.locator('#play').click(); await expect(page.locator('#overlay')).toBeHidden();
  await page.locator('#pause').click(); await page.locator('#restart').click();
  await expect(page.locator('#score')).toHaveText('0'); expect(errors).toEqual([]);
});

test('Capture, climbing, respawn, bonuses, truck and end of round', async ({ page }) => {
  await page.goto('./'); await page.locator('#play').click();
  const result = await page.evaluate(async () => {
    const { diagnostic: d } = await import('/Lucia/src/main.ts');
    const check = (ok, label) => { if (!ok) throw Error(label); };
    d.dog.root.position.copy(d.squirrels[0].mesh.position); d.step(1/60);
    check(d.state().caught === 1 && d.state().score === 100, '100 points for squirrel');
    check(d.squirrels[0].mode === 'climb', 'safe climb');
    d.dog.root.position.set(40, 0, 40);
    for (let i=0;i<300;i++) d.step(1/30);
    check(d.squirrels[0].mode === 'ground' && d.squirrels[0].mesh.visible, 'squirrel respawns');
    d.dog.root.position.copy(d.pickups[1].mesh.position); d.dog.root.position.y = 0; d.step(1/60);
    check(d.state().bones === 1 && d.state().score === 110, 'bone bonus');
    d.dog.root.position.copy(d.pickups[0].mesh.position); d.dog.root.position.y = 0; d.step(1/60);
    check(d.state().boost > 6 && d.state().bones === 2, 'speed bonus');
    d.dog.root.position.copy(d.trucks[0].root.position); d.step(1/60);
    check(d.state().slow > 2, 'truck slowdown');
    d.dog.root.position.set(40,0,40);
    for(let i=0;i<181*30;i++) d.step(1/30);
    check(d.state().mode === 'ended' && d.state().time === 0, 'round ends');
    return d.state();
  });
  expect(result.mode).toBe('ended');
  await expect(page.locator('#overlay')).toBeVisible();
  await expect(page.locator('#play')).toHaveText('Играть ещё');
});

test('Keyboard, sprint, jump, collisions and mouse camera', async ({ page }) => {
  await page.goto('./'); await page.locator('#play').click();
  await page.evaluate(async () => {const {diagnostic:d}=await import('/Lucia/src/main.ts');d.dog.root.position.set(0,0,6);});
  await page.keyboard.down('KeyW');
  const walk = await page.evaluate(async () => {const {diagnostic:d}=await import('/Lucia/src/main.ts');const z=d.dog.root.position.z;d.step(.1);return d.dog.root.position.z-z;});
  expect(walk).toBeGreaterThan(.4);
  await page.keyboard.down('Shift');
  const run = await page.evaluate(async () => {const {diagnostic:d}=await import('/Lucia/src/main.ts');const z=d.dog.root.position.z;d.step(.1);return d.dog.root.position.z-z;});
  expect(run).toBeGreaterThan(walk); await page.keyboard.up('KeyW'); await page.keyboard.up('Shift');
  await page.keyboard.down('Space');
  const height = await page.evaluate(async () => {const {diagnostic:d}=await import('/Lucia/src/main.ts');d.step(.1);return d.dog.root.position.y;});
  expect(height).toBeGreaterThan(.1); await page.keyboard.up('Space');
  // Attempt to walk into a tree from just outside its collision circle.
  await page.evaluate(async () => {const {diagnostic:d}=await import('/Lucia/src/main.ts');const o=d.obstacles[0];d.dog.root.position.set(o.x,0,o.z-o.r-.41);});
  await page.keyboard.down('KeyW');
  const moved = await page.evaluate(async () => {const {diagnostic:d}=await import('/Lucia/src/main.ts');const z=d.dog.root.position.z;d.step(.01);return Math.abs(d.dog.root.position.z-z);});
  expect(moved).toBeLessThan(.01); await page.keyboard.up('KeyW');
  await page.mouse.move(500, 400); await page.mouse.move(550, 410);
});

test('Touch controls are available on mobile viewport', async ({ browser }) => {
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const page=await context.newPage(); await page.goto('http://127.0.0.1:5173/Lucia/');
  await page.locator('#play').click(); await expect(page.locator('[data-key="KeyW"]')).toBeVisible();
  await expect(page.locator('[data-key="Space"]')).toBeVisible(); await context.close();
});
