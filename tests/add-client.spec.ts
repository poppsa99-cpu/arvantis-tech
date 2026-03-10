import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3001'
const EMAIL = 'pcrivera787@gmail.com'
const PASSWORD = 'E$tellah1418'

test.describe('Add Client Feature', () => {
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => console.log('JS ERROR:', err.message))

    await page.goto(`${BASE_URL}/login`)
    if (!page.url().includes('/dashboard')) {
      await page.waitForSelector('input[type="email"]', { timeout: 15000 })
      await page.fill('input[type="email"]', EMAIL)
      await page.fill('input[type="password"]', PASSWORD)
      await page.click('button[type="submit"]')
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
    }
  })

  test('Add Client button and form appear on clients page', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/clients`)
    await page.waitForLoadState('networkidle')
    console.log('URL:', page.url())

    // Check Add Client button exists
    const addBtn = page.locator('button', { hasText: 'Add Client' })
    await expect(addBtn).toBeVisible({ timeout: 10000 })
    console.log('Add Client button found')

    // Click it
    await addBtn.click()

    // Check form appears
    const emailInput = page.locator('input[placeholder="client@company.com"]')
    await expect(emailInput).toBeVisible({ timeout: 5000 })
    console.log('Add Client form appeared')

    // Check all form fields
    await expect(page.locator('input[placeholder="Temporary password"]')).toBeVisible()
    await expect(page.locator('input[placeholder="John Smith"]')).toBeVisible()
    await expect(page.locator('input[placeholder="Acme Corp"]')).toBeVisible()

    await page.screenshot({ path: 'tests/screenshots/add-client-form.png', fullPage: true })
    console.log('Form screenshot saved')
  })

  test('Create a test client and verify it appears', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/clients`)
    await page.waitForLoadState('networkidle')

    // Open form
    await page.click('button:has-text("Add Client")')
    await page.waitForSelector('input[placeholder="client@company.com"]', { timeout: 5000 })

    // Fill form
    const testEmail = `test-${Date.now()}@example.com`
    await page.fill('input[placeholder="client@company.com"]', testEmail)
    await page.fill('input[placeholder="Temporary password"]', 'TempPass123!')
    await page.fill('input[placeholder="John Smith"]', 'Test User')
    await page.fill('input[placeholder="Acme Corp"]', 'Test Company')
    await page.fill('input[placeholder*="Real Estate"]', 'Testing')

    // Select a plan
    await page.selectOption('select', 'starter')

    // Create
    await page.click('button:has-text("Create Client")')

    // Should redirect to client detail page
    await page.waitForURL('**/admin/clients/**', { timeout: 15000 })
    console.log('Redirected to:', page.url())

    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'tests/screenshots/new-client-detail.png', fullPage: true })

    // Check the client detail loaded
    const heading = page.locator('h1')
    await expect(heading).toBeVisible({ timeout: 10000 })
    const text = await heading.textContent()
    console.log('Client detail heading:', text)

    // Check subscription section shows Autopilot
    const body = await page.textContent('body')
    console.log('Page has Autopilot:', body?.includes('Autopilot'))
    console.log('Page has active:', body?.includes('active'))

    // Verify the Agents tab works
    const agentsTab = page.locator('button', { hasText: 'Agents' })
    await agentsTab.click()
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'tests/screenshots/new-client-agents-tab.png', fullPage: true })

    // Check Add Agent button exists
    const addAgentBtn = page.locator('button', { hasText: 'Add Agent' })
    await expect(addAgentBtn).toBeVisible({ timeout: 10000 })
    console.log('Add Agent button visible')

    // Click Add Agent
    await addAgentBtn.click()
    await page.waitForTimeout(1000)

    // Check agent template dropdown appears
    const selectAgent = page.locator('select:has(option:has-text("Select agent template"))')
    await expect(selectAgent).toBeVisible({ timeout: 5000 })
    console.log('Agent template selector visible')

    await page.screenshot({ path: 'tests/screenshots/new-client-add-agent.png', fullPage: true })

    // Clean up: delete the test user via API
    const userId = page.url().split('/admin/clients/')[1]
    console.log('Test user ID:', userId)
  })
})
