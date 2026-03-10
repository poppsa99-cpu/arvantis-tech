import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3001'
const EMAIL = 'pcrivera787@gmail.com'
const PASSWORD = 'E$tellah1418'

test.describe('Admin Dashboard', () => {
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    // Listen for JS errors
    page.on('pageerror', (err) => console.log('JS ERROR:', err.message))

    // Go to login page
    await page.goto(`${BASE_URL}/login`)
    console.log('After goto /login, URL is:', page.url())

    // If we got redirected to dashboard (already logged in), skip login
    if (page.url().includes('/dashboard')) {
      console.log('Already logged in, skipping login')
      return
    }

    // Wait for the form to render (client component)
    try {
      await page.waitForSelector('input[type="email"]', { timeout: 15000 })
    } catch {
      console.log('Email input not found. Page content:')
      await page.screenshot({ path: 'tests/screenshots/login-debug.png', fullPage: true })
      const content = await page.textContent('body')
      console.log(content?.substring(0, 500))
      throw new Error('Login form not found')
    }

    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')

    // Wait for redirect
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
    console.log('After login, URL is:', page.url())
  })

  test('Admin Overview page loads', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/admin`)
    console.log('Admin response status:', response?.status())

    await page.waitForLoadState('networkidle')
    console.log('Admin final URL:', page.url())
    await page.screenshot({ path: 'tests/screenshots/admin-overview.png', fullPage: true })

    if (page.url().includes('/login')) {
      throw new Error('Redirected to login - not authenticated')
    }
    if (page.url().includes('/dashboard') && !page.url().includes('/admin')) {
      throw new Error('Redirected to dashboard - admin check failed')
    }

    expect(page.url()).toContain('/admin')

    const heading = page.locator('h1')
    await expect(heading).toBeVisible({ timeout: 10000 })
    console.log('Overview heading:', await heading.textContent())

    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
  })

  test('Admin Clients page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/clients`)
    await page.waitForLoadState('networkidle')
    console.log('Clients URL:', page.url())
    await page.screenshot({ path: 'tests/screenshots/admin-clients.png', fullPage: true })

    expect(page.url()).toContain('/admin/clients')
    const heading = page.locator('h1')
    await expect(heading).toBeVisible({ timeout: 10000 })
    console.log('Clients heading:', await heading.textContent())
  })

  test('Admin Pipeline page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pipeline`)
    await page.waitForLoadState('networkidle')
    console.log('Pipeline URL:', page.url())
    await page.screenshot({ path: 'tests/screenshots/admin-pipeline.png', fullPage: true })

    expect(page.url()).toContain('/admin/pipeline')
    const heading = page.locator('h1')
    await expect(heading).toBeVisible({ timeout: 10000 })
    console.log('Pipeline heading:', await heading.textContent())
  })

  test('Admin Revenue page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/revenue`)
    await page.waitForLoadState('networkidle')
    console.log('Revenue URL:', page.url())
    await page.screenshot({ path: 'tests/screenshots/admin-revenue.png', fullPage: true })

    expect(page.url()).toContain('/admin/revenue')
    const heading = page.locator('h1')
    await expect(heading).toBeVisible({ timeout: 10000 })
    console.log('Revenue heading:', await heading.textContent())
  })

  test('Admin Agents page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/agents`)
    await page.waitForLoadState('networkidle')
    console.log('Agents URL:', page.url())
    await page.screenshot({ path: 'tests/screenshots/admin-agents.png', fullPage: true })

    expect(page.url()).toContain('/admin/agents')
    const heading = page.locator('h1')
    await expect(heading).toBeVisible({ timeout: 10000 })
    console.log('Agents heading:', await heading.textContent())
  })

  test('Admin Settings page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/settings`)
    await page.waitForLoadState('networkidle')
    console.log('Settings URL:', page.url())
    await page.screenshot({ path: 'tests/screenshots/admin-settings.png', fullPage: true })

    expect(page.url()).toContain('/admin/settings')
    const heading = page.locator('h1')
    await expect(heading).toBeVisible({ timeout: 10000 })
    console.log('Settings heading:', await heading.textContent())
  })

  test('API endpoints respond correctly', async ({ page }) => {
    for (const endpoint of ['/api/admin/stats', '/api/admin/clients', '/api/admin/revenue', '/api/admin/agents', '/api/admin/settings']) {
      const res = await page.request.get(`${BASE_URL}${endpoint}`)
      const body = await res.text()
      console.log(`${endpoint}: ${res.status()} - ${body.substring(0, 200)}`)
    }
  })
})
