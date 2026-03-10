import { test, devices } from '@playwright/test'

const BASE_URL = 'http://localhost:3001'
const EMAIL = 'lawyer@sydneybot.com'
const PASSWORD = 'sydney2024'

test.use({ ...devices['iPhone 14'] })

test('Mobile: login and workspace pages', async ({ page }) => {
  test.setTimeout(60000)

  // Login page
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'tests/screenshots/mobile-login.png', fullPage: true })

  // Actually login
  if (!page.url().includes('/dashboard')) {
    await page.waitForSelector('input[type="email"]', { timeout: 15000 })
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
  }

  // Skip tutorial
  await page.evaluate(() => localStorage.setItem('tutorial-seen-motion-to-strike', 'true'))

  // Go to workspace
  await page.goto(`${BASE_URL}/dashboard`)
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 15000 }).catch(() => {})

  const agentLink = page.locator('a:has-text("Motion to Strike")')
  await agentLink.click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // Workspace with sidebar closed (default on mobile)
  await page.screenshot({ path: 'tests/screenshots/mobile-workspace.png', fullPage: true })

  // Open sidebar
  const hamburger = page.locator('button[aria-label="Open menu"]')
  if (await hamburger.isVisible({ timeout: 3000 }).catch(() => false)) {
    await hamburger.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'tests/screenshots/mobile-sidebar-open.png', fullPage: true })

    // Close sidebar by clicking backdrop
    const backdrop = page.locator('.fixed.inset-0.bg-black\\/60')
    if (await backdrop.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backdrop.click()
      await page.waitForTimeout(500)
    }
  }

  console.log('Mobile screenshots saved')
})
