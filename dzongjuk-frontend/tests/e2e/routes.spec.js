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
      '/dashboard', '/admin/users', '/admin/roles', '/registration/windows', '/registration/applications', '/verification',
      '/attendance', '/masters', '/scores/summary', '/questions', '/questions/samples',
      '/certificates', '/reports', '/notifications', '/dcdd/operational',
    ],
  },
  {
    role: 'Exam Head',
    email: 'exam.head@demo.com',
    routes: ['/dashboard', '/registration/windows', '/registration/applications', '/verification', '/attendance', '/questions/upload', '/questions', '/questions/samples', '/scores/summary', '/certificates', '/reports'],
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
    routes: ['/dashboard'],
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
  await page.getByPlaceholder('Enter your password').fill('password');
  await page.getByRole('button', { name: 'Sign in to DSTS' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

test('a test taker can register without NDI and sign in', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await page.getByRole('button', { name: 'Register without NDI' }).click();

  await page.getByPlaceholder('11-digit CID number').fill('10701000001');
  await page.getByPlaceholder('Enter your full name').fill('Chimi Dema');
  await page.locator('input[type="date"]').fill('2000-01-01');
  await page.getByRole('combobox').selectOption('Female');
  await page.getByPlaceholder("Father's full name").fill('Karma Dorji');
  await page.getByPlaceholder("Mother's full name").fill('Sonam Choden');
  await page.getByPlaceholder('Dzongkhag, Gewog, Village').fill('Thimphu, Thimphu, Chang');
  await page.getByRole('button', { name: 'Submit Registration' }).click();

  await page.getByPlaceholder('Enter your CID, email, or User ID').fill('10701000001@dsts.bt');
  await page.getByPlaceholder('Enter your password').fill('Password!123');
  await page.getByRole('button', { name: 'Sign in to DSTS' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Kuzuzangpo la, Chimi!')).toBeVisible();
});

test('a user created by the administrator can sign in', async ({ page }) => {
  await login(page, 'system.admin@demo.com');
  await page.goto('/admin/users');
  await page.getByRole('button', { name: 'Add User' }).click();
  await page.getByLabel('Full Name').fill('Dechen Wangmo');
  await page.getByLabel('Email Address').fill('dechen.created@example.com');
  await page.getByLabel('CID Number').fill('10999000001');
  await page.getByLabel('Temporary Password').fill('CreatedUser!2026');
  await page.getByLabel('Chief of Examination').check();
  await page.getByRole('button', { name: 'Create User' }).click();
  await expect(page.getByText('User "Dechen Wangmo" created successfully')).toBeVisible();

  await page.getByRole('button', { name: 'Open account menu' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByPlaceholder('Enter your CID, email, or User ID').fill('dechen.created@example.com');
  await page.getByPlaceholder('Enter your password').fill('CreatedUser!2026');
  await page.getByRole('button', { name: 'Sign in to DSTS' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Welcome, Dechen!')).toBeVisible();
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
        if (route === '/dashboard') {
          await expect(page.getByText('Loading dashboard...')).toHaveCount(0);
        }
        await expect(page.locator('body')).not.toContainText('Cannot read properties of undefined');
        await expect(page.locator('body')).not.toContainText('Something went wrong');
        const routeErrors = runtimeErrors.slice(errorCount);
        expect(routeErrors, `${route}: ${routeErrors.join('\n')}`).toEqual([]);
      });
    }

    expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
  });
}
