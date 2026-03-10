import { test } from '@playwright/test'

const BASE_URL = 'http://localhost:3001'
const EMAIL = 'lawyer@sydneybot.com'
const PASSWORD = 'sydney2024'
const TEST_PDF = '/Users/phillipcustodiorivera/Desktop/Sydney Bot/scripts/test-kue.pdf'

test('View results and reply document', async ({ page }) => {
  test.setTimeout(180000)

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

  await page.evaluate(() => localStorage.setItem('tutorial-seen-motion-to-strike', 'true'))

  // Navigate to workspace
  await page.goto(`${BASE_URL}/dashboard`)
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 15000 }).catch(() => {})

  const agentLink = page.locator('a:has-text("Motion to Strike")')
  await agentLink.click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // Upload PDF
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(TEST_PDF)

  // Wait for completion
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(3000)
    const body = await page.textContent('body')
    if (body?.includes('matched') && (body?.includes('View') || body?.includes('Download'))) {
      break
    }
    console.log(`Poll ${i + 1}`)
  }

  await page.waitForTimeout(2000)

  // Click View button
  const viewBtn = page.locator('button:has-text("View")')
  if (await viewBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await viewBtn.click()
    await page.waitForTimeout(2000)
  }

  // Screenshot the results view showing defense cards
  await page.screenshot({ path: 'tests/screenshots/results-defenses.png', fullPage: true })

  // Scroll down to see the reply document
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'tests/screenshots/results-reply.png', fullPage: true })

  // Check each defense card for correct numbering
  const defenseCards = page.locator('text=/Defense #\\d+/')
  const count = await defenseCards.count()
  console.log(`Found ${count} defense cards`)
  for (let i = 0; i < count; i++) {
    const text = await defenseCards.nth(i).textContent()
    console.log(`Defense card ${i + 1}:`, text?.slice(0, 100))
  }
})
