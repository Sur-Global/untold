import { test, expect } from '@playwright/test'

test.describe('Auth', () => {
  test('shows signup form', async ({ page }) => {
    await page.goto('/auth/signup')
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible()
  })

  test('shows login form', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible()
  })

  test('locale switcher is accessible on login page', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByRole('button', { name: /EN/i })).toBeVisible()
  })
})
