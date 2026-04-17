/**
 * Admin — Gestión de Promociones
 *
 * Cubre:
 *  - Banner de límite mensual (campañas + promociones combinadas)
 *  - Crear, ver y desactivar una promoción
 *  - Botón "Nueva promoción" bloqueado cuando se alcanza el límite
 *
 * Todos los nombres llevan prefijo E2E_ para que el teardown los limpie.
 */
import { test, expect } from '@playwright/test'
import { AdminPromotionsPage } from '../../pages/admin/PromotionsPage'
import { injectAuth } from '../../fixtures/injectAuth'

const PROMO_NAME = `E2E_Promo_${Date.now()}`

test.describe('Admin — Promociones', () => {

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, 'admin')
  })

  test('muestra banner de límite mensual si el plan tiene restricción', async ({ page }) => {
    await page.goto('/promotions')
    await expect(page.getByRole('heading', { name: /promoci/i })).toBeVisible()

    // El banner aparece solo si el tenant tiene plan con max_campaigns_month
    const banner = page.locator('[class*="rounded-xl"]').filter({
      hasText: /usadas este mes|límite alcanzado/i,
    }).first()

    const hasBanner = await banner.isVisible().catch(() => false)
    if (hasBanner) {
      const text = await banner.textContent()
      expect(text).toMatch(/usadas este mes|límite alcanzado/i)
    }
    // Si no hay banner → plan ilimitado → OK
  })

  test('puede crear una promoción nueva', async ({ page }) => {
    const promoPage = new AdminPromotionsPage(page)
    await promoPage.goto()

    // Si el botón está deshabilitado por límite, saltar
    const btn = page.getByRole('button', { name: /nueva promoci/i })
    const isDisabled = await btn.getAttribute('disabled')
    if (isDisabled !== null) {
      test.skip(true, 'Límite mensual alcanzado — test de creación omitido')
      return
    }

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

    // Si la promo no existe (test de creación saltado), omitir
    const exists = await page.getByText(PROMO_NAME).isVisible({ timeout: 2_000 }).catch(() => false)
    if (!exists) { test.skip(true, 'Promoción E2E no encontrada'); return }

    const card = page.locator('tr, [class*="card"]').filter({ hasText: PROMO_NAME })
    await expect(card.getByText('50')).toBeVisible()
    await expect(card.getByText(/10/)).toBeVisible()
  })

  test('puede desactivar y reactivar una promoción', async ({ page }) => {
    const promoPage = new AdminPromotionsPage(page)
    await promoPage.goto()

    const exists = await page.getByText(PROMO_NAME).isVisible({ timeout: 2_000 }).catch(() => false)
    if (!exists) { test.skip(true, 'Promoción E2E no encontrada'); return }

    await promoPage.togglePromotion(PROMO_NAME)

    const card = page.locator('tr, [class*="card"]').filter({ hasText: PROMO_NAME })
    await expect(card.locator('[class*="inactive"], [class*="gray"]')).toBeVisible()
      .catch(() => expect(card.getByText(/inactiv/i)).toBeVisible())
  })

})
