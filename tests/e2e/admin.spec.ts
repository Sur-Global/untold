import { test, expect } from '@playwright/test'

test.describe('Admin — unauthenticated guard', () => {
  test('redirects /admin to login when not authenticated', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/auth\/login|auth\/signup/)
  })
})

test.describe('Admin — non-admin guard', () => {
  /**
   * Requires E2E_NON_ADMIN_EMAIL and E2E_NON_ADMIN_PASSWORD env vars.
   * Skipped when those credentials are absent.
   */
  test('redirects /admin to / when logged in as non-admin', async ({ page }) => {
    const nonAdminEmail = process.env.E2E_NON_ADMIN_EMAIL
    const nonAdminPassword = process.env.E2E_NON_ADMIN_PASSWORD
    test.skip(!nonAdminEmail || !nonAdminPassword, 'E2E_NON_ADMIN_EMAIL / E2E_NON_ADMIN_PASSWORD not set')

    await page.goto('/auth/login')
    await page.getByLabel(/email/i).fill(nonAdminEmail!)
    await page.getByLabel(/password/i).fill(nonAdminPassword!)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/dashboard|\//)

    await page.goto('/admin')
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/)
  })
})

test.describe('Admin — smoke tests', () => {
  /**
   * Requires E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD env vars.
   */
  test.skip(
    'all four admin pages render without 500 when logged in as admin',
    async ({ page }) => {
      const adminEmail = process.env.E2E_ADMIN_EMAIL
      const adminPassword = process.env.E2E_ADMIN_PASSWORD

      await page.goto('/auth/login')
      await page.getByLabel(/email/i).fill(adminEmail!)
      await page.getByLabel(/password/i).fill(adminPassword!)
      await page.getByRole('button', { name: /log in/i }).click()
      await page.waitForURL((url) => !url.toString().includes('auth/login'))

      for (const path of [
        '/admin',
        '/admin/translations',
        '/admin/content',
        '/admin/users',
      ]) {
        const response = await page.goto(path)
        expect(response?.status()).not.toBe(500)
        await expect(page).not.toHaveURL(/error/)
      }
    },
  )
})
