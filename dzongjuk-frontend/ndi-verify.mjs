import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

await page.goto('http://localhost:5000/login', { waitUntil: 'networkidle' });

// Click the NDI login button
const ndiBtn = page.getByRole('button', { name: /NDI/i }).first();
await ndiBtn.click();
await page.waitForTimeout(4000);

const body = await page.locator('body').innerText();
const qrCount = await page.locator('canvas, svg').count();

console.log('QR canvas/svg count:', qrCount);
console.log('Shows "Network Error":', body.includes('Network Error'));
console.log('Shows "unavailable":', /unavailable/i.test(body));
console.log('---- modal text tail ----');
console.log(body.split('\n').filter(Boolean).slice(-12).join(' | '));
console.log('---- console errors ----');
console.log(consoleErrors);

await page.screenshot({ path: 'ndi-verify.png', fullPage: true });
await browser.close();
