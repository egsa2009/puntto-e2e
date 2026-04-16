import { type Page, expect } from '@playwright/test'

export class ClientBenefitsPage {
  constructor(private page: Page) {}

  async goto(slug: string) {
    await this.page.goto(`/${slug}/benefits`)
    await expect(this.page.getByRole('heading', { name: /beneficios/i })).toBeVisible()
  }

  async getPointsBalance(): Promise<number> {
    const text = await this.page.getByText(/\d+ puntos disponibles/i).textContent()
    const match = text?.match(/(\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  async getBenefitCards() {
    return this.page.locator('[class*="rounded-2xl"]').filter({ hasText: /pts/ })
  }

  async getCardStatus(promotionName: string): Promise<string> {
    const card = this.page.locator('[class*="rounded-2xl"]').filter({ hasText: promotionName })
    const statusBar = card.locator('[class*="rounded-xl"]').last()
    return (await statusBar.textContent()) || ''
  }

  async assertNoRedeemButton() {
    // La app cliente NO debe tener ningun boton de "Canjear" que descuente puntos
    const redeemBtn = this.page.getByRole('button', { name: /canjear|redimir/i })
    await expect(redeemBtn).not.toBeVisible()
  }

  async assertAlreadyRedeemed(promotionName: string) {
    const card = this.page.locator('[class*="rounded-2xl"]').filter({ hasText: promotionName })
    await expect(card.getByText(/ya lo canjeaste en tienda|ya canjeado/i)).toBeVisible()
  }

  async assertAvailable(promotionName: string) {
    const card = this.page.locator('[class*="rounded-2xl"]').filter({ hasText: promotionName })
    await expect(card.getByText(/disponible.*cajero|presenta al cajero/i)).toBeVisible()
  }
}
