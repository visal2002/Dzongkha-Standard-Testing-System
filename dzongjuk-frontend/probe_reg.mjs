import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
const srv = spawn('npx vite preview --host 127.0.0.1 --port 4310', { stdio: 'ignore', shell: true });
await new Promise(r => setTimeout(r, 6000));
const b = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, 'desktop'], [768, 1024, 'tablet'], [390, 844, 'mobile']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('http://127.0.0.1:4310/login');
  await p.getByRole('button', { name: 'Register', exact: true }).click();
  await p.waitForTimeout(400);
  const noNdi = p.getByRole('button', { name: /Register without NDI/i });
  if (await noNdi.count()) { await noNdi.click(); await p.waitForTimeout(700); }
  const form = p.locator('form').first();
  const box = await form.boundingBox();
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const cols = await form.evaluate(el => getComputedStyle(el).gridTemplateColumns);
  console.log(`${tag} ${w}x${h}: formWidth=${box ? Math.round(box.width) : 'n/a'} cols="${cols}" hOverflow=${overflow}`);
  await p.screenshot({ path: `/tmp/reg-${tag}.png`, fullPage: true });
  await p.close();
}
await b.close(); srv.kill();
