import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
const srv = spawn('npx vite preview --host 127.0.0.1 --port 4312', { stdio: 'ignore', shell: true });
await new Promise(r => setTimeout(r, 6000));
const b = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, 'desktop'], [768, 1024, 'tablet'], [390, 844, 'mobile']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('http://127.0.0.1:4312/login');
  await p.getByRole('button', { name: 'Register', exact: true }).click();
  await p.waitForTimeout(400);
  const n = p.getByRole('button', { name: /Register without NDI/i });
  if (await n.count()) { await n.click(); await p.waitForTimeout(700); }
  const over = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const clipped = await p.getByRole('button', { name: /Submit Registration/i }).evaluate(el => {
    const r = el.getBoundingClientRect(); return { w: Math.round(r.width), visible: r.top >= 0 };
  });
  console.log(`${tag}: submitBtnWidth=${clipped.w} hOverflow=${over}`);
  await p.screenshot({ path: `/tmp/reg3-${tag}.png`, fullPage: true });
  await p.close();
}
await b.close(); srv.kill();
