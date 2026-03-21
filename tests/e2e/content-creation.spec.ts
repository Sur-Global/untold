import { test, expect } from '@playwright/test'

test.describe('Content creation — unauthenticated guards', () => {
  const protectedRoutes = [
    '/create',
    '/create/article',
    '/create/video',
    '/create/podcast',
    '/create/pill',
    '/create/course',
    '/dashboard',
  ]

  for (const route of protectedRoutes) {
    test(`redirects ${route} to login when unauthenticated`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/auth\/login|auth\/signup/)
    })
  }
})

test.describe('Dashboard — unauthenticated guards', () => {
  const editRoutes = [
    '/dashboard/videos/fake-id/edit',
    '/dashboard/podcasts/fake-id/edit',
    '/dashboard/pills/fake-id/edit',
    '/dashboard/courses/fake-id/edit',
  ]

  for (const route of editRoutes) {
    test(`redirects ${route} to login when unauthenticated`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/auth\/login|auth\/signup/)
    })
  }
})
