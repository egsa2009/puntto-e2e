import { type Page, expect } from '@playwright/test'

export class PosScanPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/scan')
    await expect(this.page.getByText(/escanear cliente/i)).toBeVisible()
  }

  /** Busca un cliente por código QR usando el ingreso manual (no cámara) */
  async lookupCustomerByCode(qrCode: string) {
    await this.page.getByRole('button', { name: /manual|ingresar codigo/i }).click()
    await this.page.getByPlaceholder(/codigo|pega/i).fill(qrCode)
    await this.page.getByRole('button', { name: /buscar/i }).click()

    // Esperar a que aparezca la tarjeta del cliente
    await expect(this.page.locator('[class*="rounded-2xl"]').filter({
      hasText: /puntos disponibles/i
    })).toBeVisible({ timeout: 8_000 })
  }

  async getCustomerName(): Promise<string> {
    const el = this.page.locator('h3, [class*="font-bold"]').filter({ hasText: /[A-Z]/ }).first()
    return (await el.textContent()) || ''
  }

  async getCustomerBalance(): Promise<number> {
    const el = this.page.locator('[class*="text-2xl"][class*="font-bold"][class*="text-primary"]').first()
    const text = await el.textContent()
    return text ? parseInt(text.trim()) : 0
  }

  async goToPurchase() {
    await this.page.getByRole('button', { name: /registrar compra/i }).click()
  }

  async goToRedeemBenefit() {
    await this.page.getByRole('button', { name: /canjear beneficio/i }).click()
  }

  async goToRedeemCampaign() {
    await this.page.getByRole('button', { name: /usar campa/i }).click()
  }

  async scanAnotherCustomer() {
    await this.page.getByRole('button', { name: /escanear otro/i }).click()
    await expect(this.page.getByText(/escanear cliente/i)).toBeVisible()
  }
}
