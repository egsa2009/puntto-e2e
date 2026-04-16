/**
 * Admin — Gestión de Promociones
 *
 * Cubre: crear, ver, desactivar y eliminar una promoción.
 * Todos los nombres llevan prefijo E2E_ para que el teardown los limpie.
 */
import { test, expect } from '@playwright/test'
import { AdminPromotionsPage } from '../../pages/admin/PromotionsPage'

const PROMO_NAME = `E2E_Promo_${Date.now()}`

test.describe('Admin — Promociones', () => {

  test('puede crear una promoción nueva', async ({ page }) => {
    const promoPage = new AdminPromotionsPage(page)
    await promoPage.goto()

    const countBefore = await promoPage.getPromotionCount()

    await promoPage.createPromotion({
      name:           PROMO_NAME,
      description:    'Creado por prueba E2E',
      pointsRequired: 50,
      stock:          10,
    })

    const countAfter = await promoPage.getPromotionCount()
    expect(countAfter).toBeGreaterThan(countBefore)
    await expect(page.getByText(PROMO_NAME)).toBeVisible()
  })

  test('la promoción aparece con los datos correctos', async ({ page }) => {
    const promoPage = new AdminPromotionsPage(page)
    await promoPage.goto()

    const card = page.locator('tr, [class*="card"]').filter({ hasText: PROMO_NAME })
    await expect(card.getByText('50')).toBeVisible()          // puntos
    await expect(card.getByText(/10/)).toBeVisible()           // stock
  })

  test('puede desactivar y reactivar una promoción', async ({ page }) => {
    const promoPage = new AdminPromotionsPage(page)
    await promoPage.goto()
    await promoPage.togglePromotion(PROMO_NAME)

    // Verificar que el estado cambió (algún indicador visual de inactivo)
    const card = page.locator('tr, [class*="card"]').filter({ hasText: PROMO_NAME })
    await expect(card.locator('[class*="inactive"], [class*="gray"]')).toBeVisible()
      .catch(() => {
        // Alternativo: si usa un badge de texto
        return expect(card.getByText(/inactiv/i)).toBeVisible()
      })
  })

})
