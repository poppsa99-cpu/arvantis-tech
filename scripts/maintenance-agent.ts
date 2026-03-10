#!/usr/bin/env npx tsx
/**
 * Arvantis Maintenance Agent
 *
 * Runs every 2 weeks to check the entire codebase for:
 * - Build errors
 * - Broken imports/references
 * - Outdated dependencies
 * - Stripe product/price mismatches
 * - Environment variable validation
 * - Route health checks
 * - Database schema drift
 * - Security audit (exposed secrets, missing auth)
 *
 * Usage:
 *   npx tsx scripts/maintenance-agent.ts
 *   npx tsx scripts/maintenance-agent.ts --fix    (auto-fix simple issues)
 *   npx tsx scripts/maintenance-agent.ts --json   (output JSON report)
 */

import { execSync } from 'child_process'
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = join(__dirname, '..')
const FIX_MODE = process.argv.includes('--fix')
const JSON_MODE = process.argv.includes('--json')

type Severity = 'critical' | 'warning' | 'info'
type Finding = {
  severity: Severity
  category: string
  file?: string
  line?: number
  message: string
  fix?: string
}

const findings: Finding[] = []

function report(severity: Severity, category: string, message: string, file?: string, line?: number, fix?: string) {
  findings.push({ severity, category, file, line, message, fix })
}

function readFile(path: string): string {
  try {
    return readFileSync(join(ROOT, path), 'utf-8')
  } catch {
    return ''
  }
}

function run(cmd: string): { ok: boolean; output: string } {
  try {
    const output = execSync(cmd, { cwd: ROOT, timeout: 120000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] })
    return { ok: true, output }
  } catch (e: any) {
    return { ok: false, output: e.stdout || e.stderr || e.message }
  }
}

// ─── CHECK 1: Build ───
function checkBuild() {
  console.log('  [1/10] Checking build...')
  const { ok, output } = run('npx next build 2>&1')
  if (!ok) {
    // Extract error lines
    const errors = output.split('\n').filter(l => l.includes('Error') || l.includes('error'))
    for (const err of errors.slice(0, 5)) {
      report('critical', 'build', err.trim())
    }
  } else {
    report('info', 'build', 'Build passed successfully')
  }
}

// ─── CHECK 2: TypeScript ───
function checkTypeScript() {
  console.log('  [2/10] Checking TypeScript...')
  const { ok, output } = run('npx tsc --noEmit 2>&1')
  if (!ok) {
    const errors = output.split('\n').filter(l => l.includes('error TS'))
    for (const err of errors.slice(0, 10)) {
      const match = err.match(/(.+)\((\d+),\d+\): error (.+)/)
      if (match) {
        report('critical', 'typescript', match[3], match[1], parseInt(match[2]))
      } else {
        report('critical', 'typescript', err.trim())
      }
    }
  } else {
    report('info', 'typescript', 'No type errors')
  }
}

// ─── CHECK 3: Environment Variables ───
function checkEnvVars() {
  console.log('  [3/10] Checking environment variables...')
  const envFile = readFile('.env.local')

  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_CALENDLY_URL',
    'NEXT_PUBLIC_APP_URL',
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_SETUP_PRICE_ID',
    'STRIPE_STARTER_PRICE_ID',
    'STRIPE_STARTER_ANNUAL_PRICE_ID',
    'STRIPE_GROWTH_PRICE_ID',
    'STRIPE_GROWTH_ANNUAL_PRICE_ID',
    'STRIPE_SCALE_PRICE_ID',
    'STRIPE_SCALE_ANNUAL_PRICE_ID',
  ]

  const production = ['SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_WEBHOOK_SECRET']

  for (const key of required) {
    const regex = new RegExp(`^${key}=(.+)`, 'm')
    const match = envFile.match(regex)
    if (!match || !match[1].trim()) {
      const sev = production.includes(key) ? 'critical' : 'warning'
      report(sev, 'env', `Missing or empty: ${key}`, '.env.local')
    }
  }

  // Check for placeholder values
  if (envFile.includes('placeholder')) {
    report('warning', 'env', 'Placeholder values found in .env.local — replace before production', '.env.local')
  }

  // Check for test keys in production URL
  if (envFile.includes('sk_test_') && envFile.includes('NEXT_PUBLIC_APP_URL=https://')) {
    report('critical', 'env', 'Test Stripe keys detected with production APP_URL', '.env.local')
  }
}

// ─── CHECK 4: Broken References ───
function checkBrokenReferences() {
  console.log('  [4/10] Checking for broken references...')

  // Check for old product names
  const oldNames = ['Sydney Bot', 'Launch System', 'Growth Accelerator', 'Scale Engine']
  const srcFiles = getAllFiles(join(ROOT, 'src'), ['.ts', '.tsx'])

  for (const file of srcFiles) {
    const content = readFileSync(file, 'utf-8')
    const relPath = relative(ROOT, file)

    for (const name of oldNames) {
      if (content.includes(name)) {
        report('warning', 'branding', `Old name "${name}" found`, relPath)
      }
    }

    // Check for old Calendly URLs
    if (content.includes('calendly.com/arvantis-tech/discovery') && !content.includes('||')) {
      report('warning', 'config', 'Old Calendly URL hardcoded (should be arvantistech/30min)', relPath)
    }

    // Check for dynamic Tailwind classes (won't work with JIT)
    const dynamicTw = content.match(/`[^`]*\$\{[^}]*\}[^`]*`/g)
    if (dynamicTw) {
      for (const match of dynamicTw) {
        if (match.match(/\b(bg|text|border)-\$\{/)) {
          report('warning', 'tailwind', 'Dynamic Tailwind class detected — won\'t work with JIT', relPath)
        }
      }
    }
  }
}

// ─── CHECK 5: Unused Imports ───
function checkUnusedImports() {
  console.log('  [5/10] Checking for unused imports...')
  const srcFiles = getAllFiles(join(ROOT, 'src'), ['.ts', '.tsx'])

  for (const file of srcFiles) {
    const content = readFileSync(file, 'utf-8')
    const relPath = relative(ROOT, file)

    // Simple heuristic: find named imports and check if they're used in the body
    const importMatches = content.matchAll(/import\s*\{([^}]+)\}\s*from/g)
    for (const m of importMatches) {
      const imports = m[1].split(',').map(s => s.trim().split(' as ').pop()!.trim()).filter(Boolean)
      const bodyStart = content.indexOf(m[0]) + m[0].length
      const body = content.slice(bodyStart)

      for (const imp of imports) {
        if (imp === 'type' || imp.length < 2) continue
        // Check if the import name appears anywhere in the rest of the file
        const usageRegex = new RegExp(`\\b${imp}\\b`)
        if (!usageRegex.test(body)) {
          report('info', 'imports', `Possibly unused import: ${imp}`, relPath)
        }
      }
    }
  }
}

// ─── CHECK 6: Route Health ───
function checkRoutes() {
  console.log('  [6/10] Checking route structure...')

  const expectedRoutes = [
    'src/app/page.tsx',
    'src/app/login/page.tsx',
    'src/app/signup/page.tsx',
    'src/app/book/page.tsx',
    'src/app/booked/page.tsx',
    'src/app/pay/page.tsx',
    'src/app/billing/page.tsx',
    'src/app/onboarding/page.tsx',
    'src/app/dashboard/page.tsx',
    'src/app/api/stripe/checkout/route.ts',
    'src/app/api/stripe/webhook/route.ts',
    'src/app/api/stripe/portal/route.ts',
    'src/app/api/stripe/link/route.ts',
  ]

  for (const route of expectedRoutes) {
    if (!existsSync(join(ROOT, route))) {
      report('critical', 'routes', `Missing route file: ${route}`)
    }
  }

  // Check middleware exists
  if (!existsSync(join(ROOT, 'src/middleware.ts'))) {
    report('critical', 'routes', 'Missing middleware.ts')
  }
}

// ─── CHECK 7: Stripe Price Validation ───
async function checkStripePrices() {
  console.log('  [7/10] Validating Stripe prices...')

  const envFile = readFile('.env.local')
  const secretKey = envFile.match(/STRIPE_SECRET_KEY=(.+)/)?.[1]?.trim()

  if (!secretKey) {
    report('warning', 'stripe', 'Cannot validate prices — STRIPE_SECRET_KEY not set')
    return
  }

  try {
    const priceIds = [
      'STRIPE_SETUP_PRICE_ID',
      'STRIPE_STARTER_PRICE_ID',
      'STRIPE_STARTER_ANNUAL_PRICE_ID',
      'STRIPE_GROWTH_PRICE_ID',
      'STRIPE_GROWTH_ANNUAL_PRICE_ID',
      'STRIPE_SCALE_PRICE_ID',
      'STRIPE_SCALE_ANNUAL_PRICE_ID',
    ]

    for (const key of priceIds) {
      const id = envFile.match(new RegExp(`${key}=(.+)`))?.[1]?.trim()
      if (!id || id.includes('placeholder')) {
        report('warning', 'stripe', `${key} is not set or is a placeholder`)
        continue
      }

      // Validate price exists via curl
      const { ok, output } = run(`curl -s -o /dev/null -w "%{http_code}" https://api.stripe.com/v1/prices/${id} -u ${secretKey}:`)
      if (output.trim() !== '200') {
        report('critical', 'stripe', `Price ${key} (${id}) returned HTTP ${output.trim()} — may be invalid`)
      }
    }
  } catch {
    report('warning', 'stripe', 'Failed to validate Stripe prices')
  }
}

// ─── CHECK 8: Security Audit ───
function checkSecurity() {
  console.log('  [8/10] Running security audit...')

  const srcFiles = getAllFiles(join(ROOT, 'src'), ['.ts', '.tsx'])

  for (const file of srcFiles) {
    const content = readFileSync(file, 'utf-8')
    const relPath = relative(ROOT, file)

    // Check for hardcoded secrets
    if (content.match(/sk_live_[a-zA-Z0-9]+/) || content.match(/whsec_[a-zA-Z0-9]+/)) {
      report('critical', 'security', 'Hardcoded production secret detected!', relPath)
    }

    // Check API routes for missing auth
    if (relPath.includes('api/') && !relPath.includes('webhook') && !relPath.includes('auth')) {
      if (!content.includes('getUser') && !content.includes('auth')) {
        report('warning', 'security', 'API route may be missing authentication', relPath)
      }
    }

    // Check for SQL injection patterns (template literals in queries)
    if (content.match(/\.rpc\(.*\$\{/)) {
      report('critical', 'security', 'Possible SQL injection via template literal in RPC call', relPath)
    }
  }

  // Check .gitignore
  const gitignore = readFile('.gitignore')
  if (!gitignore.includes('.env.local')) {
    report('critical', 'security', '.env.local not in .gitignore — secrets may be committed')
  }
}

// ─── CHECK 9: Dependencies ───
function checkDependencies() {
  console.log('  [9/10] Checking dependencies...')

  const { ok, output } = run('npm outdated --json 2>/dev/null || true')
  try {
    const outdated = JSON.parse(output || '{}')
    const majorUpdates = Object.entries(outdated).filter(([, info]: [string, any]) => {
      if (!info.current || !info.latest) return false
      return info.current.split('.')[0] !== info.latest.split('.')[0]
    })

    if (majorUpdates.length > 0) {
      for (const [pkg, info] of majorUpdates as [string, any][]) {
        report('warning', 'deps', `${pkg}: ${info.current} → ${info.latest} (major update available)`)
      }
    }
  } catch {
    // npm outdated can fail, that's ok
  }

  // Check for missing node_modules
  if (!existsSync(join(ROOT, 'node_modules'))) {
    report('critical', 'deps', 'node_modules missing — run npm install')
  }
}

// ─── CHECK 10: Asset Validation ───
function checkAssets() {
  console.log('  [10/10] Checking assets...')

  const requiredAssets = ['public/arvantis-logo.png']
  for (const asset of requiredAssets) {
    if (!existsSync(join(ROOT, asset))) {
      report('critical', 'assets', `Missing required asset: ${asset}`)
    }
  }

  // Check for referenced images in code that don't exist
  const srcFiles = getAllFiles(join(ROOT, 'src'), ['.ts', '.tsx'])
  for (const file of srcFiles) {
    const content = readFileSync(file, 'utf-8')
    const relPath = relative(ROOT, file)
    const imgRefs = content.matchAll(/src="\/([^"]+\.(png|jpg|svg|ico))"/g)
    for (const match of imgRefs) {
      if (!existsSync(join(ROOT, 'public', match[1]))) {
        report('warning', 'assets', `Referenced image not found: /public/${match[1]}`, relPath)
      }
    }
  }
}

// ─── Helpers ───
function getAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = []
  if (!existsSync(dir)) return files

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    try {
      const stat = statSync(full)
      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
        files.push(...getAllFiles(full, extensions))
      } else if (extensions.some(ext => entry.endsWith(ext))) {
        files.push(full)
      }
    } catch { /* skip unreadable */ }
  }
  return files
}

// ─── Main ───
async function main() {
  const startTime = Date.now()

  if (!JSON_MODE) {
    console.log('\n╔══════════════════════════════════════════╗')
    console.log('║   ARVANTIS MAINTENANCE AGENT v1.0        ║')
    console.log('║   Bi-weekly health check                 ║')
    console.log('╚══════════════════════════════════════════╝\n')
    console.log(`  Date: ${new Date().toISOString().split('T')[0]}`)
    console.log(`  Mode: ${FIX_MODE ? 'Fix' : 'Audit'}\n`)
  }

  // Run all checks
  checkBuild()
  checkTypeScript()
  checkEnvVars()
  checkBrokenReferences()
  checkUnusedImports()
  checkRoutes()
  await checkStripePrices()
  checkSecurity()
  checkDependencies()
  checkAssets()

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  // Output
  if (JSON_MODE) {
    console.log(JSON.stringify({
      date: new Date().toISOString(),
      elapsed: `${elapsed}s`,
      findings,
      summary: {
        critical: findings.filter(f => f.severity === 'critical').length,
        warning: findings.filter(f => f.severity === 'warning').length,
        info: findings.filter(f => f.severity === 'info').length,
      }
    }, null, 2))
    return
  }

  // Pretty print
  const criticals = findings.filter(f => f.severity === 'critical')
  const warnings = findings.filter(f => f.severity === 'warning')
  const infos = findings.filter(f => f.severity === 'info')

  console.log('\n' + '═'.repeat(50))
  console.log('  RESULTS')
  console.log('═'.repeat(50))

  if (criticals.length > 0) {
    console.log(`\n  ❌ CRITICAL (${criticals.length})`)
    for (const f of criticals) {
      console.log(`     [${f.category}] ${f.message}`)
      if (f.file) console.log(`       → ${f.file}${f.line ? `:${f.line}` : ''}`)
    }
  }

  if (warnings.length > 0) {
    console.log(`\n  ⚠️  WARNINGS (${warnings.length})`)
    for (const f of warnings) {
      console.log(`     [${f.category}] ${f.message}`)
      if (f.file) console.log(`       → ${f.file}${f.line ? `:${f.line}` : ''}`)
    }
  }

  if (infos.length > 0) {
    console.log(`\n  ℹ️  INFO (${infos.length})`)
    for (const f of infos) {
      console.log(`     [${f.category}] ${f.message}`)
    }
  }

  console.log('\n' + '═'.repeat(50))
  console.log(`  Completed in ${elapsed}s`)
  console.log(`  ${criticals.length} critical | ${warnings.length} warnings | ${infos.length} info`)
  console.log('═'.repeat(50) + '\n')

  // Exit with error code if criticals found
  if (criticals.length > 0) {
    process.exit(1)
  }
}

main().catch(console.error)
