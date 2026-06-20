import { expect, test, type Page } from '@playwright/test'

async function prepareAnonymousSession (page: Page) {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
  await page.context().addCookies([
    { name: 'cookieconsent_status', value: 'dismiss', url: baseUrl },
    { name: 'welcomebanner_status', value: 'dismiss', url: baseUrl }
  ])
}

// check if the login flow works correctly, including error handling for wrong credentials. 
// Only the UI Elements are used in this test, no API calls are made directly. 
test.describe('login flow', () => {
  test('logs in with valid credentials and shows the account menu', async ({ page }) => {
    await prepareAnonymousSession(page)

    await page.goto('/#/login')

    await page.getByLabel(/email/i).fill('jim@juice-sh.op')
    await page.getByLabel(/password/i).fill('ncc-1701')
    await page.getByRole('button', { name: /log in/i }).click()

    await expect(page).toHaveURL(/#\/$/)
    await expect(page.getByRole('button', { name: /account/i })).toBeVisible()
  })

  test('shows an error message when the password is wrong', async ({ page }) => {
    await prepareAnonymousSession(page)

    await page.goto('/#/login')

    await page.getByLabel(/email/i).fill('jim@juice-sh.op')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /log in/i }).click()

    await expect(page.getByText(/invalid email or password/i)).toBeVisible()
  })
})
