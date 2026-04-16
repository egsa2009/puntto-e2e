/**
 * POS — Registrar Compra
 *
 * Flujo completo: escanear cliente (manual) → registrar compra → verificar puntos ganados.
 * Usa el QR code del cliente de prueba definido en .env.test
 */
import { test, expect } from '@playwright/test'
import { PosScanPage }    from '../../pages/pos/ScanPage'
import { PosPurchasePage } from '../../pages/pos/PurchasePage'
import { adminClient, getTenantId } from '../../fixtures/supabase'

const SLUG            = process.env.TEST_SLUG         || 'momotea'
const TEST_CLIENT_QR  = process.env.TEST_CLIENT_QR    || ''   // QR del cliente de prueba
const PURCHASE_AMOUNT = 50_000  // $50.000 COP — debe dar puntos según la config del tenant

test.describe('POS — Registrar Compra', () => {

  test.skip(!TEST_CLIENT_QR, 'TEST_CLIENT_QR no configurado en .env.test')

  test('registra una compra y suma puntos al cliente', async ({ page }) => {
    const scanPage     = new PosScanPage(page)
    const purchasePage = new PosPurchasePage(page)

    // 1. Escanear cliente por código manual
    await scanPage.goto()
    await scanPage.lookupCustomerByCode(TEST_CLIENT_QR)

    const balanceBefore = await scanPage.getCustomerBalance()

    // 2. Ir a registrar compra
    await scanPage.goToPurchase()
    await purchasePage.waitForLoad()

    // 3. Registrar la compra con referencia E2E para limpieza
    await purchasePage.registerPurchase(PURCHASE_AMOUNT, `E2E_PURCHASE_${Date.now()}`)
    await purchasePage.assertSuccess()

    // 4. Volver al scan y verificar que el balance aumentó
    await page.goto('/scan')
    await scanPage.lookupCustomerByCode(TEST_CLIENT_QR)
    const balanceAfter = await scanPage.getCustomerBalance()

    expect(balanceAfter).toBeGreaterThan(balanceBefore)
  })

  test('el cliente aparece con su nombre y nivel correcto', async ({ page }) => {
    const scanPage = new PosScanPage(page)
    await scanPage.goto()
    await scanPage.lookupCustomerByCode(TEST_CLIENT_QR)

    const name = await scanPage.getCustomerName()
    expect(name.length).toBeGreaterThan(0)

    // Verificar que muestra el nivel
    await expect(page.getByText(/nivel \d/i)).toBeVisible()
  })

})
