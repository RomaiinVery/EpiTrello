import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/auth');

    await expect(page.locator('h2')).toContainText(/connexion/i);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth');

    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    // Wait for button to be enabled and click
    const submitButton = page.getByRole('button', { name: /se connecter/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Setup waiter for the auth network request
    const authResponsePromise = page.waitForResponse(response =>
      response.url().includes('/api/auth/') && response.request().method() === 'POST'
    );

    const submitButton = page.getByRole('button', { name: /se connecter/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Wait for the network response to complete
    await authResponsePromise;

    // Check for any error message (using class selector for robustness)
    await expect(page.locator('.text-red-600')).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to register mode', async ({ page }) => {
    await page.goto('/auth');

    // Click the toggle button to switch to register mode
    await page.getByRole('button', { name: /créer un compte/i }).click();

    await expect(page.locator('h2')).toContainText(/créer un compte/i);
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /s'inscrire/i })).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    // Expect redirect to /auth with callbackUrl
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should redirect to login for workspace access', async ({ page }) => {
    await page.goto('/workspaces/test-workspace-id');
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should redirect to login for board access', async ({ page }) => {
    await page.goto('/workspaces/test-workspace-id/boards/test-board-id');
    await expect(page).toHaveURL(/\/auth/);
  });
});
