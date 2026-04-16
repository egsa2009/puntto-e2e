/**
 * global.setup.ts
 * Corre UNA VEZ antes de toda la suite.
 * Responsabilidades:
 *   1. Hacer login en cada app y guardar el storage state (.auth/*.json)
 *      para que los tests no tengan que hacer login en cada spec.
 *   2. Limpiar datos de prueba que puedan haber quedado de una corrida anterior.
 */
import { test as setup, expect } from '@playwright/test'
import { cleanTestData, getTenantId } from './fixtures/supabase'

const ADMIN_URL  = process.env.ADMIN_URL  || 'http://localhost:5174'
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const POS_URL    = process.env.POS_URL    || 'http://localhost:5175'
const SLUG       = process.env.TEST_SLUG  || 'momotea'

// ─── 1. Login Admin ─────────────────────────────────────────────────────────
setup('login admin', async ({ page }) => {
  await page.goto(`${ADMIN_URL}/login`)
  await page.getByPlaceholder(/correo|email/i).fill(process.env.TEST_ADMIN_EMAIL!)
  await page.getByPlaceholder(/contraseña|password/i).fill(process.env.TEST_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: /iniciar sesion|login|entrar/i }).click()

  // Esperar a que llegue al dashboard
  await expect(page).toHaveURL(/dashboard|overview|resumen/, { timeout: 10_000 })
  await page.context().storageState({ path: '.auth/admin.json' })
  console.log('✅ Admin autenticado')
})

// ─── 2. Login Cliente ────────────────────────────────────────────────────────
setup('login cliente', async ({ page }) => {
  await page.goto(`${CLIENT_URL}/${SLUG}/login`)
  await page.getByPlaceholder(/teléfono|telefono|phone/i).fill(
    process.env.TEST_CLIENT_PHONE || '3000000001'
  )

  // Si el flujo es por OTP, saltar este step — ver nota en .env.example
  // Por ahora asumimos login con email/password si existe
  const passwordInput = page.getByPlaceholder(/contraseña|password/i)
  if (await passwordInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await passwordInput.fill(process.env.TEST_CLIENT_PASSWORD!)
    await page.getByRole('button', { name: /entrar|continuar|login/i }).click()
  }

  await expect(page).toHaveURL(new RegExp(`${SLUG}/dashboard`), { timeout: 10_000 })
  await page.context().storageState({ path: '.auth/client.json' })
  console.log('✅ Cliente autenticado')
})

// ─── 3. Login POS ────────────────────────────────────────────────────────────
setup('login pos', async ({ page }) => {
  await page.goto(`${POS_URL}/login`)
  await page.getByPlaceholder(/correo|email/i).fill(process.env.TEST_CASHIER_EMAIL!)
  await page.getByPlaceholder(/contraseña|password/i).fill(process.env.TEST_CASHIER_PASSWORD!)
  await page.getByRole('button', { name: /iniciar sesion|login|entrar/i }).click()

  await expect(page).toHaveURL(/scan/, { timeout: 10_000 })
  await page.context().storageState({ path: '.auth/pos.json' })
  console.log('✅ Cajero POS autenticado')
})

// ─── 4. Limpiar datos de prueba anteriores ───────────────────────────────────
setup('limpiar datos E2E anteriores', async () => {
  const tenantId = await getTenantId(SLUG)
  await cleanTestData(tenantId)
  console.log('✅ Datos E2E anteriores eliminados')
})
