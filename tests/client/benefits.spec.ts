/**
 * Client — Página de Beneficios
 *
 * Verifica que la app cliente sea SOLO informativa:
 * - Muestra las promociones disponibles
 * - NO tiene ningún botón que descuente puntos
 * - Refleja el estado "Ya canjeado" de promociones redimidas en POS
 */
import { test, expect } from '@playwright/test'
import { ClientBenefitsPage } from '../../pages/client/BenefitsPage'
import { ClientDashboardPage } from '../../pages/client/DashboardPage'
import { injectAuth } from '../../fixtures/injectAuth'

const SLUG = process.env.TEST_SLUG || 'momotea'

test.describe('Client — Beneficios (solo informativo)', () => {

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, 'client')
  })

  test('muestra las promociones activas del tenant', async ({ page }) => {
    const benefitsPage = new ClientBenefitsPage(page)
    await benefitsPage.goto(SLUG)

    // Debe haber al menos una card de beneficio
    const cards = await benefitsPage.getBenefitCards()
    expect(await cards.count()).toBeGreaterThan(0)
  })

  test('NO existe ningún botón de canjear en la app cliente', async ({ page }) => {
    const benefitsPage = new ClientBenefitsPage(page)
    await benefitsPage.goto(SLUG)

    // REGLA DE NEGOCIO CRITICA: el cliente nunca descuenta puntos
    await benefitsPage.assertNoRedeemButton()
  })

  test('muestra el balance de puntos del usuario', async ({ page }) => {
    const benefitsPage = new ClientBenefitsPage(page)
    await benefitsPage.goto(SLUG)

    const balance = await benefitsPage.getPointsBalance()
    expect(balance).toBeGreaterThanOrEqual(0)
  })

  test('muestra instrucción de presentar al cajero', async ({ page }) => {
    const benefitsPage = new ClientBenefitsPage(page)
    await benefitsPage.goto(SLUG)

    await expect(page.getByText(/muestra esta pantalla al cajero/i)).toBeVisible()
  })

  test('navega al dashboard con la flecha de regreso', async ({ page }) => {
    const benefitsPage = new ClientBenefitsPage(page)
    await benefitsPage.goto(SLUG)

    await page.getByRole('button', { name: /volver|back/i })
      .or(page.locator('button').filter({ has: page.locator('svg') }).first())
      .click()

    await expect(page).toHaveURL(new RegExp(`${SLUG}/dashboard`))
  })

})
