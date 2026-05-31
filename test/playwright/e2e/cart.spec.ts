import { expect, test, type Page } from '@playwright/test'

// dismisses the cookie and welcome banner, so tests are not affected by it
async function prepareAnonymousSession (page: Page) {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
  await page.context().addCookies([
    { name: 'cookieconsent_status', value: 'dismiss', url: baseUrl },
    { name: 'welcomebanner_status', value: 'dismiss', url: baseUrl }
  ])
}

test.describe('shopping cart flow', () => {
  test('fills the basket from the UI and verifies the quantity in the basket view', async ({ page }) => {
    await prepareAnonymousSession(page)

    await page.goto('/#/search?q=Apple%20Juice')

    const firstProduct = page.locator('app-product').first()
    const productName = (await firstProduct.locator('.name').textContent())?.trim()

    expect(productName).toBeTruthy()

    const addButton = firstProduct.getByRole('button', { name: /add to basket/i })
    await addButton.click()
    await addButton.click()

    await expect(page.locator('.warn-notification')).toHaveText('2')

    await page.getByRole('button', { name: /show the shopping cart/i }).click()

    await expect(page.getByRole('heading', { name: /basket/i })).toBeVisible()
    await expect(page.getByText(productName as string, { exact: true })).toBeVisible()
    await expect(page.locator('mat-cell.mat-column-quantity .cell-initial-font').first()).toContainText('2')
    await expect(page.locator('#price')).toBeVisible()
  })
})