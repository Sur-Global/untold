import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('renders UNTOLD heading', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'UNTOLD' })).toBeVisible()
  })

  test('Spanish locale renders at /es/', async ({ page }) => {
    await page.goto('/es')
    await expect(page).toHaveURL(/\/es/)
  })
})
