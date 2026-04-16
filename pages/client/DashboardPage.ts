import { type Page, expect } from '@playwright/test'

export class ClientDashboardPage {
  constructor(private page: Page) {}

  async goto(slug: string) {
    await this.page.goto(`/${slug}/dashboard`)
    await expect(this.page.locator('body')).toBeVisible()
  }

  async getPointsBalance(): Promise<number> {
    // El balance aparece como número grande en el dashboard
    const balanceEl = this.page.locator('[class*="text-primary"]').filter({ hasText: /^\d+$/ }).first()
    const text = await balanceEl.textContent()
    return text ? parseInt(text.trim()) : 0
  }

  async goToBenefits() {
    await this.page.getByRole('link', { name: /beneficio/i }).click()
    await expect(this.page.getByRole('heading', { name: /beneficio/i })).toBeVisible()
  }

  async getQrCode(): Promise<string> {
    await this.page.getByRole('button', { name: /qr|codigo/i }).click().catch(() => {})
    // El QR code puede estar en un data-testid o en el src de una imagen
    const qrEl = this.page.locator('[data-testid="qr-value"], canvas, img[alt*="QR"]')
    const value = await qrEl.getAttribute('data-value') || ''
    return value
  }
}
