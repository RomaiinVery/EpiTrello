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

    const submitButton = page.getByRole('button', { name: /se connecter/i });
    await expect(submitButton).toBeEnabled();

    // Wait for the auth request to complete
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/auth/') && response.request().method() === 'POST',
      { timeout: 15000 }
    );

    await submitButton.click();

    // Wait for the auth response
    await responsePromise.catch(() => {
      // Ignore timeout, we'll check for error message anyway
    });

    // Wait for the loading state to finish (button text changes back)
    await expect(submitButton).toContainText(/se connecter/i, { timeout: 15000 });

    // Check for error message using data-testid for robustness
    await expect(page.getByTestId('error-message')).toBeVisible({ timeout: 15000 });
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
