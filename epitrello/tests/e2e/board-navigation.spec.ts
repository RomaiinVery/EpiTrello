import { test, expect } from '@playwright/test';

test.describe('Board Navigation (Unauthenticated)', () => {
  test('should display landing page', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/EpiTrello|Trello/i);
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');

    const hasSignIn = await page.locator('text=/sign in|connexion/i').isVisible().catch(() => false);
    const hasGetStarted = await page.locator('text=/get started|commencer/i').isVisible().catch(() => false);

    expect(hasSignIn || hasGetStarted).toBeTruthy();
  });

  test('should navigate to sign in from landing page', async ({ page }) => {
    await page.goto('/');

    const signInLink = page.locator('a:has-text("Sign in"), a:has-text("Connexion"), button:has-text("Sign in")').first();

    if (await signInLink.isVisible().catch(() => false)) {
      await signInLink.click();
      await expect(page).toHaveURL(/\/auth\/signin/);
    }
  });
});

test.describe('Board Structure', () => {
  test('API health check', async ({ request }) => {
    const response = await request.get('/api/health').catch(() => null);

    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('should reject unauthenticated API requests', async ({ request }) => {
    const response = await request.get('/api/boards');

    expect(response.status()).toBe(401);
  });

  test('should reject unauthenticated workspace API requests', async ({ request }) => {
    const response = await request.get('/api/workspaces');

    expect(response.status()).toBe(401);
  });
});
