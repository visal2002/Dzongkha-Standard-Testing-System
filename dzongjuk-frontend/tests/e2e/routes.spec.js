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

// FIX 1: Must match MOCK_PASSWORD in src/services/auth.js
const MOCK_PASSWORD = 'LocalTestOnly!2026';

const login = async (page, email) => {
  await page.goto('/login');
  await page.getByPlaceholder('Enter your CID, email, or User ID').fill(email);
  await page.getByPlaceholder('Enter your password').fill(MOCK_PASSWORD);
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
  await page.getByPlaceholder('8-digit mobile number').fill('17123456');
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
  // FIX 2: 'Chief of Examination' doesn't exist — ROLE_LABELS has 'Exam Head' for exam_head
  await page.getByLabel('Exam Head').check();
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
      if (message.type() === 'error') {
        const text = message.text();
        // FIX 3: Filter out network errors — no real backend runs in mock/CI mode.
        // Services other than auth.js still call http://localhost:8000 which is refused.
        if (text.includes('ERR_CONNECTION_REFUSED') || text.includes('Failed to load resource')) return;
        runtimeErrors.push(text);
      }
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

// The access matrix denies these routes. A guard that only hides the menu item is
// not enough, so each one is requested directly by URL. PrivateRoute sends a denied
// request back to /dashboard.
const deniedRoutes = [
  {
    role: 'Test Taker',
    email: 'test.taker@demo.com',
    // Registration is "Create / view own": the applicant's own records only, never
    // the organisation-wide list. Band Scores is "View own result", so the
    // cross-candidate summary is closed too.
    routes: [
      '/registration/applications', '/verification', '/attendance', '/questions',
      '/questions/upload', '/scores', '/scores/summary', '/reports',
      '/admin/users', '/admin/roles',
    ],
  },
  {
    role: 'Committee Member',
    email: 'member@dsts.bt',
    routes: [
      '/verification', '/attendance', '/questions', '/questions/upload',
      '/certificates', '/scores', '/admin/users', '/admin/roles',
    ],
  },
  {
    role: 'Committee Head',
    email: 'committee.head@demo.com',
    routes: ['/verification', '/attendance', '/questions/upload', '/admin/users', '/admin/roles'],
  },
  {
    role: 'Exam Head',
    email: 'exam.head@demo.com',
    routes: ['/admin/users', '/admin/roles', '/scores'],
  },
];

for (const account of deniedRoutes) {
  test(`${account.role} is denied the routes the access matrix withholds`, async ({ page }) => {
    await login(page, account.email);

    for (const route of account.routes) {
      await test.step(route, async () => {
        await page.goto(route);
        await expect(page, `${account.role} reached ${route}`).toHaveURL(/\/dashboard$/);
      });
    }
  });
}

test('a test taker cannot read another applicant through the applications list', async ({ page }) => {
  await login(page, 'test.taker@demo.com');

  await page.goto('/registration/applications');
  await expect(page).toHaveURL(/\/dashboard$/);

  // The own-scoped screen stays reachable.
  await page.goto('/my-applications');
  await expect(page).toHaveURL(/\/my-applications$/);
});
