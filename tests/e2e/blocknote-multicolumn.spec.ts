import { test, expect } from '@playwright/test'

test.describe('BlockNote multi-column + locale', () => {
  test('slash menu shows column options in German editor', async ({ page }) => {
    /**
     * This test requires:
     * - Logged-in author session (E2E_AUTHOR_EMAIL / E2E_AUTHOR_PASSWORD)
     * - Server running with German locale support
     * - Article in /de/dashboard/articles
     *
     * Verifies that BlockNote's slash command menu includes column options
     * when the editor is initialized in German locale.
     */
    test.skip(
      !process.env.E2E_AUTHOR_EMAIL || !process.env.E2E_AUTHOR_PASSWORD,
      'E2E_AUTHOR_EMAIL / E2E_AUTHOR_PASSWORD not set'
    )

    const authorEmail = process.env.E2E_AUTHOR_EMAIL!
    const authorPassword = process.env.E2E_AUTHOR_PASSWORD!

    // Sign in as author
    await page.goto('/auth/login')
    await page.getByLabel(/email/i).fill(authorEmail)
    await page.getByLabel(/password/i).fill(authorPassword)
    await page.getByRole('button', { name: /log in/i }).click()

    // Wait for redirect away from login
    await page.waitForURL((url) => !url.toString().includes('auth/login'))

    // Navigate to German dashboard articles
    await page.goto('/de/dashboard/articles')
    await expect(page).not.toHaveURL(/error/)

    // Click the edit link for the first article
    await page.getByRole('link', { name: /edit/i }).first().click()

    // Wait for editor to load
    await page.waitForSelector('.bn-editor', { timeout: 5000 })

    // Click in the editor
    await page.locator('.bn-editor').click()

    // Type the slash command
    await page.keyboard.type('/')

    // Verify column options appear (in German: "Spalten")
    await expect(page.getByText(/spalten/i)).toBeVisible({ timeout: 3000 })
  })

  test('column blocks render side-by-side in article reader', async ({ page }) => {
    /**
     * This test requires:
     * - Published article with column content in the database
     * - Article available at /en/articles
     *
     * Verifies that columnList blocks are rendered with CSS Grid display
     * to position columns side-by-side in the reader view.
     */
    await page.goto('/en/articles')
    await expect(page).not.toHaveURL(/error/)

    // Check if a column list exists (may not on fresh database)
    const articleWithColumns = page.locator('.bn-column-list').first()

    // Only verify CSS if columns are present
    const columnCount = await page.locator('.bn-column-list').count()
    if (columnCount > 0) {
      // Verify the column list uses CSS Grid
      const displayValue = await articleWithColumns.evaluate((el) =>
        window.getComputedStyle(el).getPropertyValue('display')
      )
      expect(displayValue).toBe('grid')

      // Verify columns are children of the column list
      const columns = articleWithColumns.locator('.bn-column')
      const columnTotal = await columns.count()
      expect(columnTotal).toBeGreaterThan(0)
    }
  })

  test('column blocks stack on mobile', async ({ page }) => {
    /**
     * This test requires:
     * - Published article with column content in the database
     * - Mobile viewport (375x812 — iPhone SE)
     *
     * Verifies that columnList blocks stack vertically (single-column layout)
     * on mobile viewports instead of displaying side-by-side.
     */
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/en/articles')
    await expect(page).not.toHaveURL(/error/)

    const columnListCount = await page.locator('.bn-column-list').count()
    if (columnListCount > 0) {
      const columnList = page.locator('.bn-column-list').first()
      await expect(columnList).toBeVisible()

      // Get the computed grid-template-columns value
      const gridCols = await columnList.evaluate((el) =>
        window.getComputedStyle(el).getPropertyValue('grid-template-columns')
      )

      // On mobile, should be a single column (1fr or similar)
      // Regex matches "1fr" or single pixel width values
      expect(gridCols).toMatch(/^(1fr|minmax\([^)]+\)|\d+(\.\d+)?(px|%))$/)
    }
  })

  test('blocknote editor initializes without 500 error on /create', async ({ page }) => {
    /**
     * This test requires:
     * - Logged-in author session (E2E_AUTHOR_EMAIL / E2E_AUTHOR_PASSWORD)
     *
     * Verifies that the create page loads without errors when the editor
     * is initialized with the multi-column schema.
     */
    test.skip(
      !process.env.E2E_AUTHOR_EMAIL || !process.env.E2E_AUTHOR_PASSWORD,
      'E2E_AUTHOR_EMAIL / E2E_AUTHOR_PASSWORD not set'
    )

    const authorEmail = process.env.E2E_AUTHOR_EMAIL!
    const authorPassword = process.env.E2E_AUTHOR_PASSWORD!

    // Sign in as author
    await page.goto('/auth/login')
    await page.getByLabel(/email/i).fill(authorEmail)
    await page.getByLabel(/password/i).fill(authorPassword)
    await page.getByRole('button', { name: /log in/i }).click()

    // Wait for redirect away from login
    await page.waitForURL((url) => !url.toString().includes('auth/login'))

    // Navigate to create article page
    const response = await page.goto('/create/article')
    expect(response?.status()).not.toBe(500)
    await expect(page).not.toHaveURL(/error/)

    // Wait for editor to load
    await page.waitForSelector('.bn-editor', { timeout: 5000 })
    await expect(page.locator('.bn-editor')).toBeVisible()
  })

  test('column list markup is valid in HTML output', async ({ page }) => {
    /**
     * This test requires:
     * - Published article with column content in the database
     *
     * Verifies that the HTML output of column blocks includes the correct
     * structure for CSS Grid layout (data-columns attribute and .bn-column divs).
     */
    await page.goto('/en/articles')
    await expect(page).not.toHaveURL(/error/)

    const columnListCount = await page.locator('.bn-column-list').count()
    if (columnListCount > 0) {
      const columnList = page.locator('.bn-column-list').first()

      // Verify the data-columns attribute exists
      const dataColumns = await columnList.getAttribute('data-columns')
      if (dataColumns) {
        const columns = parseInt(dataColumns, 10)
        expect(columns).toBeGreaterThan(0)
        expect(columns).toBeLessThanOrEqual(4) // Reasonable max for columns
      }

      // Verify at least one column child exists
      const columns = columnList.locator('.bn-column')
      const columnCount = await columns.count()
      expect(columnCount).toBeGreaterThan(0)
    }
  })
})
