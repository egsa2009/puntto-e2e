/**
 * Admin — Gestión de Cajeros POS
 *
 * Cubre:
 *  - Solo accesible para Admin de Punto (con franchise_id)
 *  - Visualización del listado de cajeros
 *  - Creación de un cajero POS con credenciales temporales
 *  - Activar / desactivar cajero
 *
 * NOTA: Este test requiere que el usuario de admin en .env.test sea
 * un "Admin de Punto" (con franchise_id asignado). Si es Admin General
 * la página /staff no aparece en el nav y los tests se saltarán.
 *
 * Los emails de cajero usan prefijo e2e_cajero para que el teardown los elimine.
 */
import { test, expect } from '@playwright/test'
import { AdminStaffPage } from '../../pages/admin/StaffPage'
import { injectAuth } from '../../fixtures/injectAuth'

const CASHIER_NAME  = `E2E_Cajero_${Date.now()}`
const CASHIER_EMAIL = `e2e_cajero_${Date.now()}@test.puntto.co`
const CASHIER_PASS  = 'Test1234!'

test.describe('Admin — Cajeros POS', () => {

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, 'admin')
  })

  test('la página /staff carga correctamente para Admin de Punto', async ({ page }) => {
    await page.goto('/staff')

    // Si es Admin General, será redirigido o no verá el nav item — saltar test
    const isRedirected = page.url().includes('/dashboard') || page.url().includes('/login')
    if (isRedirected) {
      test.skip(true, 'Admin General no tiene acceso a /staff — test omitido')
      return
    }

    await expect(page.getByRole('heading', { name: /cajero/i })).toBeVisible()
  })

  test('muestra listado de cajeros o estado vacío', async ({ page }) => {
    await page.goto('/staff')

    const heading = page.getByRole('heading', { name: /cajero/i })
    const isVisible = await heading.isVisible({ timeout: 3_000 }).catch(() => false)
    if (!isVisible) { test.skip(true, 'Admin General no tiene acceso a /staff'); return }

    const staffPage = new AdminStaffPage(page)

    // Esperar que cargue: o hay filas o hay mensaje de vacío
    await page.waitForTimeout(800)
    const count     = await staffPage.getCashierCount()
    const emptyText = page.getByText(/no hay cajeros|sin cajeros/i)
    const isEmpty   = await emptyText.isVisible().catch(() => false)

    expect(count > 0 || isEmpty).toBeTruthy()
  })

  test('puede crear un cajero nuevo y muestra las credenciales', async ({ page }) => {
    await page.goto('/staff')

    const heading = page.getByRole('heading', { name: /cajero/i })
    const isVisible = await heading.isVisible({ timeout: 3_000 }).catch(() => false)
    if (!isVisible) { test.skip(true, 'Admin General no tiene acceso a /staff'); return }

    const staffPage = new AdminStaffPage(page)
    const countBefore = await staffPage.getCashierCount()

    const result = await staffPage.createCashier({
      fullName: CASHIER_NAME,
      email:    CASHIER_EMAIL,
      password: CASHIER_PASS,
    })

    expect(result).not.toBeNull()

    // El cajero debe aparecer en la lista
    await expect(page.getByText(CASHIER_NAME)).toBeVisible({ timeout: 8_000 })

    const countAfter = await staffPage.getCashierCount()
    expect(countAfter).toBeGreaterThan(countBefore)
  })

  test('puede desactivar y reactivar un cajero', async ({ page }) => {
    await page.goto('/staff')

    const heading = page.getByRole('heading', { name: /cajero/i })
    const isVisible = await heading.isVisible({ timeout: 3_000 }).catch(() => false)
    if (!isVisible) { test.skip(true, 'Admin General no tiene acceso a /staff'); return }

    const staffPage = new AdminStaffPage(page)

    // Verificar que el cajero creado en el test anterior está visible
    const cashierVisible = await page.getByText(CASHIER_NAME).isVisible({ timeout: 2_000 }).catch(() => false)
    if (!cashierVisible) { test.skip(true, 'Cajero E2E no encontrado — ejecutar test de creación primero'); return }

    await staffPage.toggleCashier(CASHIER_NAME)
    await page.waitForTimeout(600)

    const isInactive = await staffPage.isCashierInactive(CASHIER_NAME)
    expect(isInactive).toBeTruthy()

    // Reactivar
    await staffPage.toggleCashier(CASHIER_NAME)
    await page.waitForTimeout(600)

    const isInactiveAgain = await staffPage.isCashierInactive(CASHIER_NAME)
    expect(isInactiveAgain).toBeFalsy()
  })

})
