import { test, expect } from '@playwright/test'

test.describe('Article Editor — unauthenticated guards', () => {
  test('redirects /create to login when not authenticated', async ({ page }) => {
    await page.goto('/create')
    // requireCreator() throws a redirect() to /auth/login (page-level guard, not middleware)
    await expect(page).toHaveURL(/auth\/login|auth\/signup/)
  })

  test('redirects /dashboard/articles to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard/articles')
    await expect(page).toHaveURL(/auth\/login|auth\/signup/)
  })
})

test.describe('Article Editor — navigation', () => {
  test('home page renders without error', async ({ page }) => {
    // Visit home page and check nav structure (no auth — just checking nav renders)
    await page.goto('/')
    // The create button is only shown when logged in — we can only check it doesn't 500
    await expect(page).not.toHaveURL(/error/)
    await expect(page.locator('header')).toBeVisible()
  })
})
