import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3001'
const EMAIL = 'lawyer@sydneybot.com'
const PASSWORD = 'sydney2024'

test.describe('Client Dashboard', () => {
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => console.log('JS ERROR:', err.message))

    await page.goto(`${BASE_URL}/login`)
    await page.waitForLoadState('networkidle')
    if (!page.url().includes('/dashboard')) {
      await page.waitForSelector('input[type="email"]', { timeout: 15000 })
      await page.fill('input[type="email"]', EMAIL)
      await page.fill('input[type="password"]', PASSWORD)
      await page.click('button[type="submit"]')
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
    }
  })

  test('Dashboard shows agents as hero with correct name', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 15000 }).catch(() => {})

    const body = await page.textContent('body')

    // Agent should show new name
    const hasNewName = body?.includes('Motion to Strike')
    console.log('Has Motion to Strike name:', hasNewName)
    expect(hasNewName).toBe(true)

    // Should have clickable card with "Open workspace"
    const hasOpenWorkspace = body?.includes('Open workspace')
    console.log('Has Open workspace:', hasOpenWorkspace)
    expect(hasOpenWorkspace).toBe(true)

    // Billing collapsed
    const hasBilling = body?.includes('Billing & Subscription')
    expect(hasBilling).toBe(true)

    await page.screenshot({ path: 'tests/screenshots/dashboard-final.png', fullPage: true })
  })

  test('Agent card links to workspace page', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 15000 }).catch(() => {})

    // Find the agent card link
    const agentLink = page.locator('a:has-text("Motion to Strike")')
    await expect(agentLink).toBeVisible({ timeout: 10000 })

    // Check it links to the workspace (internal route)
    const href = await agentLink.getAttribute('href')
    console.log('Agent card href:', href)
    expect(href).toContain('/dashboard/agents/')

    // Click it and verify it opens the workspace
    await agentLink.click()
    await page.waitForLoadState('networkidle')
    console.log('After click URL:', page.url())
    expect(page.url()).toContain('/dashboard/agents/')

    // Should show the workspace UI (upload area)
    await page.waitForTimeout(3000)
    const portalBody = await page.textContent('body')
    const hasUploadUI = portalBody?.includes('Motion to Strike') || portalBody?.includes('Upload') || portalBody?.includes('defendant') || portalBody?.includes('browse')
    console.log('Workspace loaded with UI:', hasUploadUI)
    expect(hasUploadUI).toBe(true)

    await page.screenshot({ path: 'tests/screenshots/workspace-from-dashboard.png', fullPage: true })
  })
})
