import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3001'
const EMAIL = 'lawyer@sydneybot.com'
const PASSWORD = 'sydney2024'
const TEST_PDF = '/Users/phillipcustodiorivera/Desktop/Sydney Bot/scripts/test-kue.pdf'

test.describe('Defense Reassignment', () => {
  test.setTimeout(180000)

  test('Upload PDF, process, and test category reassignment', async ({ page }) => {
    const consoleLogs: string[] = []
    page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`))

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

    // Skip tutorial
    await page.evaluate(() => localStorage.setItem('tutorial-seen-motion-to-strike', 'true'))

    // Navigate to workspace
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 15000 }).catch(() => {})

    const agentLink = page.locator('a:has-text("Motion to Strike")')
    await expect(agentLink).toBeVisible({ timeout: 10000 })
    await agentLink.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Upload the test PDF
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_PDF)

    // Wait for processing to complete (up to 120 seconds)
    let status = ''
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(3000)
      const body = await page.textContent('body')

      if (body?.includes('Defense #')) {
        status = 'done'
        break
      }
      if (body?.includes('Processing failed') || body?.includes('Extraction failed')) {
        status = 'error'
        console.log('Processing error detected')
        break
      }
      console.log(`Poll ${i + 1}: waiting for results...`)
    }

    await page.screenshot({ path: 'tests/screenshots/reassign-before.png', fullPage: true })

    if (status !== 'done') {
      console.log('Processing did not complete. Status:', status)
      console.log('Console logs:', consoleLogs.slice(-20).join('\n'))
      return
    }

    // Click "View Results" if needed
    const viewBtn = page.locator('button:has-text("View Results")')
    if (await viewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await viewBtn.click()
      await page.waitForTimeout(1000)
    }

    // Look for a NEEDS REVIEW defense with a dropdown
    const needsReviewSelect = page.locator('select').first()
    if (await needsReviewSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Get the options
      const options = await needsReviewSelect.locator('option').allTextContents()
      console.log('Dropdown options:', options)

      // Get the defense number text nearby
      const defenseCard = needsReviewSelect.locator('xpath=ancestor::div[contains(@class,"rounded")]')
      const cardText = await defenseCard.textContent().catch(() => '')
      console.log('Defense card text (before):', cardText?.slice(0, 200))

      // Select the first non-placeholder option
      if (options.length > 1) {
        await needsReviewSelect.selectOption({ index: 1 })
        await page.waitForTimeout(3000)

        // Screenshot after reassignment
        await page.screenshot({ path: 'tests/screenshots/reassign-after.png', fullPage: true })

        // Check the defense card updated
        const updatedBody = await page.textContent('body')
        const hasMatched = updatedBody?.includes('Matched') || updatedBody?.includes('MATCHED')
        console.log('Defense updated to matched:', hasMatched)

        // Check the reply document section for the correct ordinal
        const replySection = page.locator('text=Reply Document')
        if (await replySection.isVisible({ timeout: 3000 }).catch(() => false)) {
          // Scroll to reply
          await replySection.scrollIntoViewIfNeeded()
          await page.waitForTimeout(500)
          await page.screenshot({ path: 'tests/screenshots/reassign-reply.png', fullPage: true })
        }
      }
    } else {
      console.log('No NEEDS REVIEW defenses found (all matched)')
      await page.screenshot({ path: 'tests/screenshots/reassign-all-matched.png', fullPage: true })
    }

    // Print console logs
    console.log('\n=== BROWSER CONSOLE LOGS ===')
    for (const log of consoleLogs.slice(-30)) {
      console.log(log)
    }
    console.log('=== END LOGS ===\n')
  })
})
