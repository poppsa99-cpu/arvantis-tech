import { test, expect } from '@playwright/test'
import path from 'path'

const BASE_URL = 'http://localhost:3001'
const EMAIL = 'lawyer@sydneybot.com'
const PASSWORD = 'sydney2024'
const TEST_PDF = '/Users/phillipcustodiorivera/Desktop/Sydney Bot/scripts/test-kue.pdf'

test.describe('PDF Upload Automation', () => {
  test.setTimeout(120000)

  test('Upload PDF and check extraction + processing', async ({ page }) => {
    // Capture all console messages
    const consoleLogs: string[] = []
    page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`))
    page.on('pageerror', (err) => consoleLogs.push(`[PAGE ERROR] ${err.message}`))

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

    // Navigate to workspace via agent card
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 15000 }).catch(() => {})

    const agentLink = page.locator('a:has-text("Motion to Strike")')
    await expect(agentLink).toBeVisible({ timeout: 10000 })
    await agentLink.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    console.log('Current URL:', page.url())
    await page.screenshot({ path: 'tests/screenshots/before-upload.png', fullPage: true })

    // Upload the test PDF
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_PDF)

    // Wait for extraction to start
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'tests/screenshots/during-extraction.png', fullPage: true })

    // Wait for processing (up to 60 seconds)
    let status = ''
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(3000)
      const body = await page.textContent('body')

      if (body?.includes('Complete') || body?.includes('done')) {
        status = 'complete'
        break
      }
      if (body?.includes('Failed') || body?.includes('error') || body?.includes('Error')) {
        status = 'error'
        // Get the error message
        const errorText = body?.match(/Failed.*?(?=\n|$)/)?.[0] || 'Unknown error'
        console.log('ERROR FOUND:', errorText)
        break
      }
      if (body?.includes('Processing')) {
        status = 'processing'
      }
      if (body?.includes('Extracting')) {
        status = 'extracting'
      }
      console.log(`Poll ${i + 1}: status=${status}`)
    }

    await page.screenshot({ path: 'tests/screenshots/after-processing.png', fullPage: true })

    // Print all console logs
    console.log('\n=== BROWSER CONSOLE LOGS ===')
    for (const log of consoleLogs) {
      console.log(log)
    }
    console.log('=== END LOGS ===\n')

    console.log('Final status:', status)
  })
})
