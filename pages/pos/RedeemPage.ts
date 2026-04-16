import { type Page, expect } from '@playwright/test'

export class PosRedeemPage {
  constructor(private page: Page) {}

  async waitForLoad() {
    await expect(this.page.getByRole('heading', { name: /canjear promoci/i })).toBeVisible()
  }

  async redeemPromotion(name: string) {
    const card = this.page.locator('[class*="rounded-2xl"]').filter({ hasText: name })
    await expect(card).toBeVisible({ timeout: 5_000 })

    const btn = card.getByRole('button', { name: /registrar canje/i })
    await expect(btn).toBeEnabled()
    await btn.click()
  }

  async assertSuccess(promotionName: string) {
    await expect(
      this.page.locator('[class*="green"]').filter({ hasText: /registrado correctamente|canje/i })
    ).toBeVisible({ timeout: 8_000 })
  }

  async assertAlreadyRedeemed(name: string) {
    const card = this.page.locator('[class*="rounded-2xl"]').filter({ hasText: name })
    await expect(card.getByRole('button', { name: /ya fue canjeado/i })).toBeDisabled()
  }

  async assertInsufficientPoints(name: string) {
    const card = this.page.locator('[class*="rounded-2xl"]').filter({ hasText: name })
    await expect(card.getByRole('button', { name: /puntos insuficientes/i })).toBeDisabled()
  }

  async getNewBalance(): Promise<number> {
    const successText = await this.page.locator('[class*="green"]').textContent()
    const match = successText?.match(/balance[:\s]+(\d+)/i) || successText?.match(/(\d+)\s*pts/)
    return match ? parseInt(match[1]) : 0
  }
}
