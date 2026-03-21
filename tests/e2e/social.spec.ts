import { test, expect } from '@playwright/test'

test.describe('Social — unauthenticated guards', () => {
  test('redirects /dashboard/bookmarks to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard/bookmarks')
    await expect(page).toHaveURL(/auth\/login|auth\/signup/)
  })
})

test.describe('Social — author profile', () => {
  test('unknown author slug returns 404', async ({ page }) => {
    const response = await page.goto('/author/this-slug-does-not-exist-xyz')
    expect(response?.status()).toBe(404)
  })
})

test.describe('Social — content detail pages with social buttons', () => {
  test('article detail page renders like and bookmark buttons when unauthenticated', async ({ page }) => {
    // Navigate to home first and follow any article link
    await page.goto('/')
    await expect(page).not.toHaveURL(/error/)

    const articleLink = page.locator('a[href*="/articles/"]').first()
    if (await articleLink.count() === 0) {
      // No published articles in DB — skip the button test
      return
    }
    await articleLink.click()
    await expect(page).not.toHaveURL(/error/)

    // Unauthenticated: like and bookmark buttons should be present but disabled
    const likeBtn = page.locator('button[title="Sign in to like"]')
    const bookmarkBtn = page.locator('button[title="Sign in to bookmark"]')
    await expect(likeBtn).toBeVisible()
    await expect(bookmarkBtn).toBeVisible()
    await expect(likeBtn).toBeDisabled()
    await expect(bookmarkBtn).toBeDisabled()
  })

  test('author profile page renders without error', async ({ page }) => {
    // Navigate to home and follow any author link
    await page.goto('/')
    const authorLink = page.locator('a[href*="/author/"]').first()
    if (await authorLink.count() === 0) {
      return
    }
    await authorLink.click()
    await expect(page).not.toHaveURL(/error/)
    await expect(page.locator('main')).toBeVisible()
  })
})
