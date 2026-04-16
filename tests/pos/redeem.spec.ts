/**
 * POS — Canje de Promociones
 *
 * Prueba el flujo crítico de canje y las reglas de negocio:
 *   1. Solo el POS puede descontar puntos (no el cliente)
 *   2. Una promoción canjeada no puede canjearse dos veces
 *   3. Sin puntos suficientes el botón queda deshabilitado
 */
import { test, expect } from '@playwright/test'
import { PosScanPage }   from '../../pages/pos/ScanPage'
import { PosRedeemPage } from '../../pages/pos/RedeemPage'
import { adminClient, getTenantId } from '../../fixtures/supabase'

const SLUG           = process.env.TEST_SLUG      || 'momotea'
const TEST_CLIENT_QR = process.env.TEST_CLIENT_QR || ''
const E2E_PROMO_NAME = `E2E_Promo_Canje_${Date.now()}`

test.describe('POS — Canje de Promociones', () => {

  test.skip(!TEST_CLIENT_QR, 'TEST_CLIENT_QR no configurado en .env.test')

  let tenantId: string
  let promoId: string

  // Antes de estos tests: crear una promoción E2E y asegurarse
  // de que el cliente tiene suficientes puntos para canjearla
  test.beforeAll(async () => {
    tenantId = await getTenantId(SLUG)

    // Crear promoción de prueba (50 puntos)
    const { data: promo } = await adminClient
      .from('promotions')
      .insert({
        tenant_id:       tenantId,
        name:            E2E_PROMO_NAME,
        description:     'Prueba E2E - no usar',
        points_required: 50,
        is_active:       true,
        stock:           5,
      })
      .select('id')
      .single()

    promoId = promo!.id
  })

  // Después de estos tests: limpiar la promoción E2E
  test.afterAll(async () => {
    await adminClient.from('redemptions')
      .delete()
      .eq('promotion_id', promoId)

    await adminClient.from('point_transactions')
      .delete()
      .eq('benefit_id', promoId)

    await adminClient.from('promotions')
      .delete()
      .eq('id', promoId)
  })

  test('canjea una promoción y descuenta puntos correctamente', async ({ page }) => {
    const scanPage   = new PosScanPage(page)
    const redeemPage = new PosRedeemPage(page)

    await scanPage.goto()
    await scanPage.lookupCustomerByCode(TEST_CLIENT_QR)
    const balanceBefore = await scanPage.getCustomerBalance()

    // Ir al canje
    await scanPage.goToRedeemBenefit()
    await redeemPage.waitForLoad()

    // Canjear la promoción E2E
    await redeemPage.redeemPromotion(E2E_PROMO_NAME)
    await redeemPage.assertSuccess(E2E_PROMO_NAME)

    // Verificar que el balance bajó exactamente 50 pts en el header del POS
    const headerText = await page.locator('[class*="text-white"]').filter({
      hasText: /pts disponibles/i
    }).textContent()
    const newBalance = parseInt(headerText?.match(/(\d+)/)?.[1] || '0')
    expect(newBalance).toBe(balanceBefore - 50)
  })

  test('REGLA DE NEGOCIO: la misma promoción no puede canjearse dos veces', async ({ page }) => {
    const scanPage   = new PosScanPage(page)
    const redeemPage = new PosRedeemPage(page)

    await scanPage.goto()
    await scanPage.lookupCustomerByCode(TEST_CLIENT_QR)
    await scanPage.goToRedeemBenefit()
    await redeemPage.waitForLoad()

    // La promoción ya fue canjeada en el test anterior
    await redeemPage.assertAlreadyRedeemed(E2E_PROMO_NAME)
  })

  test('botón deshabilitado si no hay puntos suficientes', async ({ page }) => {
    const scanPage   = new PosScanPage(page)
    const redeemPage = new PosRedeemPage(page)

    // Crear promoción que requiere más puntos de los que tiene el cliente
    const { data: expensivePromo } = await adminClient
      .from('promotions')
      .insert({
        tenant_id:       tenantId,
        name:            `E2E_Cara_${Date.now()}`,
        points_required: 999_999,
        is_active:       true,
      })
      .select('id')
      .single()

    await scanPage.goto()
    await scanPage.lookupCustomerByCode(TEST_CLIENT_QR)
    await scanPage.goToRedeemBenefit()
    await redeemPage.waitForLoad()

    const expensivePromoEl = page.locator('[class*="rounded-2xl"]').filter({
      hasText: 'E2E_Cara_'
    })
    await expect(
      expensivePromoEl.getByRole('button', { name: /puntos insuficientes/i })
    ).toBeDisabled()

    // Limpiar
    await adminClient.from('promotions').delete().eq('id', expensivePromo!.id)
  })

})
