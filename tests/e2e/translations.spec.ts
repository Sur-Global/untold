import { test, expect } from '@playwright/test'

test.describe('Admin translations — unauthenticated guard', () => {
  test('redirects /admin/translations to login when not authenticated', async ({ page }) => {
    await page.goto('/admin/translations')
    await expect(page).toHaveURL(/auth\/login|auth\/signup/)
  })
})

test.describe('Admin translations — non-admin guard', () => {
  /**
   * This test would require signing in as a regular (non-admin) user via the UI
   * and then visiting the admin page. Without a seeded non-admin test account,
   * this cannot be automated end-to-end. The server-side guard is covered by
   * the unit/integration test for requireAdmin(). Skipping here.
   */
  test.skip('redirects /admin/translations to / when logged in as non-admin', async ({ page }) => {
    // To implement: sign in as a regular user, then visit /admin/translations
    // and assert redirect to /.
    await page.goto('/admin/translations')
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/)
  })
})

test.describe('Admin translations — admin smoke test', () => {
  /**
   * Without a seeded admin account in the test environment this test cannot
   * authenticate, so it is skipped. When E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD
   * are available in the environment, remove the skip and implement sign-in.
   */
  test.skip('renders the translations page without a 500 error when logged in as admin', async ({ page }) => {
    // To implement: sign in via the login form using E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
    // environment variables, then visit /admin/translations and assert success.
    const adminEmail = process.env.E2E_ADMIN_EMAIL
    const adminPassword = process.env.E2E_ADMIN_PASSWORD
    test.skip(!adminEmail || !adminPassword, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set')

    await page.goto('/auth/login')
    await page.getByLabel(/email/i).fill(adminEmail!)
    await page.getByLabel(/password/i).fill(adminPassword!)
    await page.getByRole('button', { name: /log in/i }).click()

    // Wait for redirect away from login
    await page.waitForURL((url) => !url.toString().includes('auth/login'))

    const response = await page.goto('/admin/translations')
    expect(response?.status()).not.toBe(500)
    await expect(page).not.toHaveURL(/error/)
    await expect(page.locator('h1')).toContainText(/translations/i)
  })
})
