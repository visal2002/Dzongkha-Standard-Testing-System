/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { expect, test } from '@playwright/test';

const roleRoutes = [
  {
    role: 'System Admin',
    email: 'system.admin@demo.com',
    routes: ['/dashboard', '/admin/users', '/admin/roles', '/admin/technical'],
  },
  {
    role: 'DCDD Admin',
    email: 'dcdd.admin@demo.com',
    routes: [
      '/dashboard', '/registration/windows', '/registration/applications', '/verification',
      '/attendance', '/masters', '/scores/committee', '/scores/summary', '/questions/samples',
      '/certificates', '/reports', '/notifications', '/dcdd/operational',
    ],
  },
  {
    role: 'Exam Head',
    email: 'exam.head@demo.com',
    routes: ['/dashboard', '/questions/upload', '/questions', '/questions/samples', '/scores/summary', '/reports'],
  },
  {
    role: 'Committee Head',
    email: 'committee.head@demo.com',
    routes: ['/dashboard', '/scores/committee', '/scores', '/scores/summary', '/appeals', '/reports'],
  },
  {
    role: 'Committee Member',
    email: 'member@dsts.bt',
    routes: ['/dashboard', '/scores/view', '/scores/summary', '/appeals'],
  },
  {
    role: 'Chief Executive',
    email: 'chief.executive@demo.com',
    routes: ['/dashboard', '/appeals', '/reports'],
  },
  {
    role: 'Test Taker',
    email: 'test.taker@demo.com',
    routes: [
      '/dashboard', '/registration/windows', '/registration/apply', '/my-applications',
      '/scores/view', '/certificates', '/appeals/new', '/appeals', '/questions/samples',
    ],
  },
];

const login = async (page, email) => {
  await page.goto('/login');
  await page.getByPlaceholder('Enter your CID, email, or User ID').fill(email);
  await page.getByPlaceholder('Enter password').fill('password');
  await page.getByRole('button', { name: 'Sign in to DSTS' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

test('a test taker can register without NDI and sign in', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await page.getByRole('button', { name: 'Register without NDI' }).click();

  await page.getByPlaceholder('Enter your full name').fill('Chimi Dema');
  await page.getByPlaceholder('Enter 11-digit CID No.').fill('10701000001');
  await page.locator('input[type="date"]').fill('2000-01-01');
  await page.getByPlaceholder('Enter mobile number').fill('17123456');
  await page.getByPlaceholder('name@dsts.bt').fill('chimi.dema@example.com');
  await page.getByPlaceholder('At least 12 characters').fill('SecurePass!2026');
  await page.getByRole('button', { name: 'Create Account' }).click();

  await expect(page.getByPlaceholder('Enter your CID, email, or User ID')).toHaveValue('chimi.dema@example.com');
  await page.getByPlaceholder('Enter password').fill('SecurePass!2026');
  await page.getByRole('button', { name: 'Sign in to DSTS' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Kuzuzangpo la, Chimi!')).toBeVisible();
});

for (const account of roleRoutes) {
  test(`${account.role} routes render without runtime errors`, async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') runtimeErrors.push(message.text());
    });

    await login(page, account.email);

    for (const route of account.routes) {
      await test.step(route, async () => {
        const errorCount = runtimeErrors.length;
        await page.goto(route);
        await expect(page).toHaveURL(new RegExp(`${route.replaceAll('/', '\\/')}$`));
        await expect(page.locator('main')).toBeVisible();
        await page.waitForTimeout(1300);
        await expect(page.locator('body')).not.toContainText('Cannot read properties of undefined');
        await expect(page.locator('body')).not.toContainText('Something went wrong');
        const routeErrors = runtimeErrors.slice(errorCount);
        expect(routeErrors, `${route}: ${routeErrors.join('\n')}`).toEqual([]);
      });
    }

    expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
  });
}
