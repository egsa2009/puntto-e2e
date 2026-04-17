/**
 * global.setup.ts — Corre UNA VEZ antes de toda la suite.
 *
 * Estrategia de autenticación:
 *   1. Login por navegador → Supabase escribe el token en localStorage
 *   2. Leemos el localStorage raw y lo guardamos en .auth/XXX-ls.json
 *   3. Los tests lo inyectan con page.addInitScript() ANTES de que corra
 *      el JS de la página, garantizando que getSession() encuentre el token
 */
import { test as setup } from '@playwright/test'
import * as fs   from 'fs'
import * as path from 'path'
import { cleanTestData, getTenantId } from './fixtures/supabase'

const ADMIN_URL  = process.env.ADMIN_URL  || 'http://localhost:5174'
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const POS_URL    = process.env.POS_URL    || 'http://localhost:5175'
const SLUG       = process.env.TEST_SLUG  || 'momotea'
const AUTH_DIR   = path.resolve(__dirname, '.auth')

async function loginAndSaveLS(
  page:       import('@playwright/test').Page,
  loginUrl:   string,
  email:      string,
  password:   string,
  successUrl: string | RegExp,
  lsFile:     string,
  label:      string,
) {
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()

  // Esperar URL de destino post-login
  await page.waitForURL(successUrl, { timeout: 20_000 })

  // Esperar a que Supabase termine de escribir el token en localStorage
  await page.waitForFunction(
    () => Object.keys(localStorage).some(k => k.includes('auth')),
    { timeout: 10_000 }
  ).catch(() => {
    // Si tras 10s no hay token, registrar todas las claves presentes
    console.warn(`⚠️  ${label}: no se encontró clave "auth" en localStorage tras login`)
  })

  // Leer el localStorage completo
  const items = await page.evaluate((): Array<{ key: string; value: string }> => {
    const out: Array<{ key: string; value: string }> = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!
      out.push({ key: k, value: localStorage.getItem(k)! })
    }
    return out
  })

  console.log(`📦 ${label} localStorage (${items.length} items):`,
    items.map(i => i.key).join(', ') || '—vacío—')

  if (items.length === 0) {
    throw new Error(
      `❌ ${label}: localStorage vacío después del login.\n` +
      `   Verifica que las credenciales en .env.test sean correctas y que\n` +
      `   la app esté corriendo en ${loginUrl}.`
    )
  }

  fs.writeFileSync(lsFile, JSON.stringify(items, null, 2))
  console.log(`✅ ${label} — sesión guardada en ${path.basename(lsFile)}`)
}

// ─── Logins ──────────────────────────────────────────────────────────────────

setup('login admin', async ({ page }) => {
  await loginAndSaveLS(
    page,
    `${ADMIN_URL}/login`,
    process.env.TEST_ADMIN_EMAIL!,
    process.env.TEST_ADMIN_PASSWORD!,
    /dashboard/,
    path.join(AUTH_DIR, 'admin-ls.json'),
    'Admin',
  )
})

setup('login cliente', async ({ page }) => {
  await loginAndSaveLS(
    page,
    `${CLIENT_URL}/${SLUG}/login`,
    process.env.TEST_CLIENT_EMAIL!,
    process.env.TEST_CLIENT_PASSWORD!,
    new RegExp(`${SLUG}/dashboard`),
    path.join(AUTH_DIR, 'client-ls.json'),
    'Cliente',
  )
})

setup('login pos', async ({ page }) => {
  await loginAndSaveLS(
    page,
    `${POS_URL}/login`,
    process.env.TEST_CASHIER_EMAIL!,
    process.env.TEST_CASHIER_PASSWORD!,
    /scan/,
    path.join(AUTH_DIR, 'pos-ls.json'),
    'Cajero POS',
  )
})

// ─── Limpieza de datos anteriores ────────────────────────────────────────────

setup('limpiar datos E2E anteriores', async () => {
  const tenantId = await getTenantId(SLUG)
  await cleanTestData(tenantId)
  console.log('✅ Datos E2E anteriores eliminados')
})
