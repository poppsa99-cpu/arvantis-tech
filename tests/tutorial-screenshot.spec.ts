import { test } from '@playwright/test'

const BASE_URL = 'http://localhost:3001'
const EMAIL = 'lawyer@sydneybot.com'
const PASSWORD = 'sydney2024'

test('screenshot tutorial modal', async ({ page }) => {
  test.setTimeout(60000)

  // Login
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')
  if (!page.url().includes('/dashboard')) {
    await page.waitForSelector('input[type="email"]', { timeout: 15000 })
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
  }

  // Clear localStorage so tutorial auto-shows
  await page.evaluate(() => localStorage.removeItem('tutorial-seen-motion-to-strike'))

  // Go to workspace
  await page.goto(`${BASE_URL}/dashboard`)
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 15000 }).catch(() => {})

  const agentLink = page.locator('a:has-text("Motion to Strike")')
  await agentLink.click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)

  // Tutorial should auto-show on first visit
  await page.screenshot({ path: 'tests/screenshots/tutorial-modal.png', fullPage: true })

  // Click "Continue to steps" to see step slides
  const continueBtn = page.locator('button:has-text("Continue to")')
  if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await continueBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'tests/screenshots/tutorial-step1.png', fullPage: true })

    // Click next step
    const nextBtn = page.locator('button:has-text("Next step")')
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: 'tests/screenshots/tutorial-step2.png', fullPage: true })
    }
  }

  console.log('Tutorial screenshots saved')
})
