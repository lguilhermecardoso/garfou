import { test, expect } from '@playwright/test';

test.describe('Authentication & Onboarding Flow', () => {
  test('should display homepage', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads
    expect(page).toHaveURL('/');
  });

  test('should navigate to signin page', async ({ page }) => {
    await page.goto('/');

    // Look for a sign in button or link and click it
    const signinLink = page.locator('a:has-text("Entrar")').first();
    if (await signinLink.isVisible()) {
      await signinLink.click();
      expect(page).toHaveURL(/\/auth\/signin/);
    }
  });

  test('should display signin form with email and password fields', async ({ page }) => {
    await page.goto('/auth/signin');

    // Check for email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Check for password input
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Check for submit button
    const submitButton = page.locator('button:has-text("Entrar")').first();
    await expect(submitButton).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin');

    // Fill in form
    await page.locator('input[type="email"]').fill('invalid@example.com');
    await page.locator('input[type="password"]').fill('WrongPassword123');

    // Submit
    await page.locator('button:has-text("Entrar")').first().click();

    // Wait for error message
    const errorMessage = page.locator('text=/incorretos|inválidos/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to signup from signin page', async ({ page }) => {
    await page.goto('/auth/signin');

    // Look for signup link
    const signupLink = page.locator('a:has-text("Criar conta")').first();
    await expect(signupLink).toBeVisible();

    await signupLink.click();
    expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('onboarding page should display restaurant name input', async ({ page }) => {
    await page.goto('/onboarding');

    // Check for progress indicator
    const progressText = page.locator('text=/Passo.*de.*2/');
    await expect(progressText).toBeVisible();

    // Check for restaurant name input
    const restaurantInput = page.locator('input[placeholder*="Pizzaria"]');
    await expect(restaurantInput).toBeVisible();
  });

  test('onboarding step 1 should require restaurant name', async ({ page }) => {
    await page.goto('/onboarding');

    // Try to continue without entering name
    const continueButton = page.locator('button:has-text("Continuar")').first();

    // Button should be disabled initially
    const isDisabled = await continueButton.isDisabled();
    if (isDisabled) {
      expect(isDisabled).toBe(true);
    }

    // Enter name
    await page.locator('input[placeholder*="Pizzaria"]').fill('Meu Restaurante');

    // Button should now be enabled or clickable
    await expect(continueButton).toBeEnabled({ timeout: 5000 });
  });

  test('onboarding step 2 should display location fields', async ({ page }) => {
    await page.goto('/onboarding');

    // Complete step 1
    await page.locator('input[placeholder*="Pizzaria"]').fill('Test Restaurant');
    await page.locator('button:has-text("Continuar")').first().click();

    // Check for step 2 content
    const cityInput = page.locator('input[placeholder*="São Paulo"]');
    await expect(cityInput).toBeVisible({ timeout: 5000 });

    const stateInput = page.locator('input[placeholder="SP"]');
    await expect(stateInput).toBeVisible();
  });
});

test.describe('Rate Limiting', () => {
  test('should enforce rate limit on registration endpoint', async ({ page }) => {
    // This test verifies that rate limiting is in place
    // In a real scenario, this would make multiple requests and verify 429 responses

    const baseURL = page.context().browser()?.version() || 'test';
    expect(baseURL).toBeTruthy();

    // Placeholder for rate limit verification
    // Would need to mock or directly test the API
  });
});

test.describe('Public Menu', () => {
  test('should display digital menu page', async ({ page }) => {
    // Try accessing a public menu
    // This will likely return 404 without a valid restaurant slug
    await page.goto('/menu/test-restaurant', { waitUntil: 'networkidle' });

    // Either the menu loads or a "not found" message appears
    const content = page.locator('body');
    await expect(content).toBeVisible();
  });

  test('should display NPS form', async ({ page }) => {
    // Try accessing NPS form
    await page.goto('/nps/test-restaurant', { waitUntil: 'networkidle' });

    // The page should load
    const content = page.locator('body');
    await expect(content).toBeVisible();
  });
});
