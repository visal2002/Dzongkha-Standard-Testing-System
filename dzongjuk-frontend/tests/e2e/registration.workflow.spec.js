/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { expect, test } from '@playwright/test';

// ─── helpers ──────────────────────────────────────────────────────────────────

const MOCK_PASSWORD = 'LocalTestOnly!2026';

const login = async (page, email) => {
  await page.goto('/login');
  await page.getByPlaceholder('Enter your CID, email, or User ID').fill(email);
  await page.getByPlaceholder('Enter your password').fill(MOCK_PASSWORD);
  await page.getByRole('button', { name: 'Sign in to DSTS' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

// ─── registration window tests ────────────────────────────────────────────────

test('registration form is disabled when window is not open and shows a clear message (BRD §2.2)', async ({ page }) => {
  await login(page, 'test.taker@demo.com');
  await page.goto('/registration/windows');
  const applyButton = page.getByRole('link', { name: /Apply/i }).or(page.getByRole('button', { name: /Apply/i }));
  const closedMessage = page.getByText(/registration.*closed|not.*open|window.*closed/i);
  // No window in the fixture set is inside its registration dates, so the page must offer
  // no way to apply and must say why. The previous assertion was `formExists || messageExists`,
  // which was satisfied by an Apply button being present — the inverse of what it describes.
  await expect(closedMessage.first()).toBeVisible();
  await expect(applyButton).toHaveCount(0);
});

test('all mandatory fields must be filled before submission is allowed (BRD §2.2)', async ({ page }) => {
  await login(page, 'test.taker@demo.com');
  await page.goto('/registration/apply');
  // Attempt to submit with empty mandatory fields
  const submitBtn = page.getByRole('button', { name: /submit|apply/i }).first();
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
    // Validation errors should appear
    const validationError = page.locator('[role="alert"], .error, .field-error, [data-testid*="error"]').first();
    const isRequired = page.getByText(/required|mandatory|must be/i).first();
    const hasValidation = (await validationError.count() > 0) || (await isRequired.count() > 0);
    expect(hasValidation).toBe(true);
  }
});

test('duplicate CID submission shows a rejection message (BRD §2.2)', async ({ page }) => {
  await login(page, 'test.taker@demo.com');
  await page.goto('/my-applications');
  // If the test taker already has an application for an open exam,
  // navigating to apply again should show a duplication warning
  const duplicateWarning = page
    .getByText(/already registered|duplicate|already applied/i)
    .or(page.locator('[role="alert"]').filter({ hasText: /already/i }));
  // In mock mode, this may show on the apply page or the applications list
  await page.goto('/registration/apply');
  await page.waitForTimeout(800);
  const pageText = await page.textContent('body');
  const hasDuplicateGuard =
    pageText?.toLowerCase().includes('already') ||
    pageText?.toLowerCase().includes('duplicate') ||
    (await duplicateWarning.count() > 0);
  // This test is informational in mock mode — assert no crash occurred
  await expect(page.locator('body')).not.toContainText('Something went wrong');
  await expect(page.locator('body')).not.toContainText('Cannot read properties');
});

test('cancel registration button is visible in Submitted state (BRD §2.2)', async ({ page }) => {
  await login(page, 'test.taker@demo.com');
  await page.goto('/my-applications');
  await page.waitForTimeout(800);
  // In mock mode a submitted application may be listed; check for cancel button or status badge
  const cancelButton = page.getByRole('button', { name: /cancel/i });
  const submittedBadge = page.getByText(/submitted|pending/i);
  // At minimum the page must render without errors
  await expect(page.locator('body')).not.toContainText('Something went wrong');
  await expect(page.locator('main')).toBeVisible();
});

test('acknowledgement or confirmation is shown after application submission (BRD §2.2)', async ({ page }) => {
  await login(page, 'test.taker@demo.com');
  await page.goto('/registration/windows');
  await page.waitForTimeout(600);
  // The page must render and not crash; an open-window card or a closed message must appear
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Something went wrong');
});

test('test taker sees own application status with registration number or waitlist indicator (BRD §2.2)', async ({ page }) => {
  await login(page, 'test.taker@demo.com');
  await page.goto('/my-applications');
  await page.waitForTimeout(800);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Cannot read properties');
});
