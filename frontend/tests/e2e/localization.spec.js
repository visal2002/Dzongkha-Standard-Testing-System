import { expect, test } from '@playwright/test';

const loginAsSystemAdmin = async page => {
  await page.goto('/login');
  await page.getByPlaceholder('Enter your 4-digit User ID or email').fill('system.admin@demo.com');
  await page.getByPlaceholder('Enter your password').fill('LocalTestOnly!2026');
  await page.getByRole('button', { name: 'Sign in to DSTS' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

test('Dzongkha selection translates dashboard and sidebar-route content and persists across navigation', async ({ page }) => {
  await loginAsSystemAdmin(page);
  await expect(page.getByText('System Administration', { exact: true })).toBeVisible();

  await page.getByTitle('Dzongkha').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'dz');
  await expect(page.getByText('རིམ་ལུགས་བདག་སྐྱོང་།', { exact: true })).toBeVisible();
  await expect(page.getByText('ལག་ལེན་པ་ཡོངས་བསྡོམས།', { exact: true })).toBeVisible();
  await expect(page.getByText('གཞི་རྟེན་ཞབས་ཏོག་གནས་སྟངས།', { exact: true })).toBeVisible();
  await expect(page.getByText('System Administration', { exact: true })).toHaveCount(0);

  await page.goto('/admin/users');
  await expect(page.locator('html')).toHaveAttribute('lang', 'dz');
  await expect(page.getByText('ལག་ལེན་པ་འཛིན་སྐྱོང་།', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('User Management', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByText('User Management', { exact: true }).first()).toBeVisible();
});
