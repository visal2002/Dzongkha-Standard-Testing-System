import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
const srv = spawn('npx vite preview --host 127.0.0.1 --port 4330', { stdio: 'ignore', shell: true });
await new Promise(r => setTimeout(r, 6000));
const b = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('http://127.0.0.1:4330/login');
  await p.getByRole('button', { name: 'Register', exact: true }).click();
  await p.waitForTimeout(400);
  const n = p.getByRole('button', { name: /Register without NDI/i });
  if (await n.count()) { await n.click(); await p.waitForTimeout(800); }
  const labels = await p.locator('form label').allInnerTexts();
  console.log(`${tag} fields: ${JSON.stringify(labels)}`);
  await p.screenshot({ path: `/tmp/fields-${tag}.png`, fullPage: true });
  await p.close();
}
await b.close(); srv.kill();
