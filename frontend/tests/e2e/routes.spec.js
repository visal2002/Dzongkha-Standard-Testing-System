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
    // Chief of Examiner. The approved matrix gives this role Read across
    // Registration, Question Upload, Band Scores, Certificates and Reports, plus the
    // Approve step on Re-evaluation.
    role: 'Chief of Examiner',
    email: 'chief.executive@demo.com',
    routes: [
      '/dashboard', '/registration/windows', '/registration/applications', '/questions',
      '/questions/samples', '/scores/summary', '/appeals', '/certificates', '/reports',
    ],
  },
  {
    role: 'Test Taker',
    email: 'test.taker@demo.com',
    routes: [
      '/dashboard', '/registration/windows', '/registration/apply', '/my-applications',
      '/scores/view', '/certificates', '/appeals/new', '/appeals', '/questions/samples',
      '/reports/my',
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
        // FIX 3: Filter out network errors — no real backend serves the mock build.
        // Services other than auth.js still call http://localhost:8000. With nothing
        // listening the browser reports ERR_CONNECTION_REFUSED; on a developer machine
        // running the backend locally it answers the preflight without an
        // Access-Control-Allow-Origin for the preview origin, so the same dead call
        // surfaces as a CORS error instead. Both are network noise, not the runtime
        // errors these smoke tests exist to catch.
        if (
          text.includes('ERR_CONNECTION_REFUSED')
          || text.includes('Failed to load resource')
          || text.includes('blocked by CORS policy')
        ) return;
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
    // Reports is "View own": /reports/my is theirs, the organisation-wide analytics
    // page is not. `read_own` satisfies a plain `read`, so /reports is guarded with
    // `read_all` precisely to keep this closed.
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
  {
    // Chief of Examiner holds Read plus the appeal approval step, and nothing else:
    // no administration, no verification, no absentee, no question upload, no score
    // entry, and no committee constitution.
    role: 'Chief of Examiner',
    email: 'chief.executive@demo.com',
    routes: [
      '/admin/users', '/admin/roles', '/verification', '/attendance',
      '/questions/upload', '/scores', '/scores/committee', '/masters',
      '/dcdd/operational', '/appeals/new',
    ],
  },
  {
    // The matrix confines the System Administrator to users, roles and permissions.
    // The backend keeps a `*` wildcard as documented break-glass; the frontend must
    // not mirror it, so score entry and DCDD operational settings stay closed.
    // Exam configuration (masters) is DCDD's business/policy config, not System
    // Admin's technical remit, so it stays closed too.
    role: 'System Admin',
    email: 'system.admin@demo.com',
    routes: ['/scores', '/dcdd/operational', '/masters'],
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

test('a test taker gets their own reports but not the organisation-wide analytics', async ({ page }) => {
  await login(page, 'test.taker@demo.com');

  await page.goto('/reports');
  await expect(page, 'a test taker reached organisation-wide Reports').toHaveURL(/\/dashboard$/);

  await page.goto('/reports/my');
  await expect(page).toHaveURL(/\/reports\/my$/);
  await expect(page.getByRole('heading', { name: 'My Reports' })).toBeVisible();
});

test('the sidebar offers a test taker the personal screens and no organisation-wide ones', async ({ page }) => {
  await login(page, 'test.taker@demo.com');

  const sidebar = page.locator('aside');
  await expect(sidebar.getByRole('link', { name: 'My Reports' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'My Results' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Reports', exact: true })).toHaveCount(0);
  await expect(sidebar.getByRole('link', { name: 'User Management' })).toHaveCount(0);
  await expect(sidebar.getByRole('link', { name: 'Verification' })).toHaveCount(0);
});

test('a committee member sees the appeal queue read-only, with no decision controls', async ({ page }) => {
  await login(page, 'member@dsts.bt');

  await page.goto('/appeals');
  await expect(page).toHaveURL(/\/appeals$/);
  await page.waitForTimeout(800);

  // Process and Approve are separate matrix actions; a Committee Member holds neither.
  await expect(page.getByRole('button', { name: 'Approve Revision' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Complete as No Change' })).toHaveCount(0);
});

test('the encrypted question document controls are withheld from metadata-only roles', async ({ page }) => {
  await login(page, 'dcdd.admin@demo.com');

  await page.goto('/questions');
  await expect(page).toHaveURL(/\/questions$/);
  await page.waitForTimeout(800);

  // DCDD holds Question Upload "Read" - the listing, never the encrypted file.
  await expect(page.getByRole('button', { name: 'Download' })).toHaveCount(0);
});
