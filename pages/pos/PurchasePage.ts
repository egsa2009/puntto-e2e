import { type Page, expect } from '@playwright/test'

export class PosPurchasePage {
  constructor(private page: Page) {}

  async waitForLoad() {
    await expect(this.page.getByRole('heading', { name: /registrar compra/i })).toBeVisible()
  }

  async registerPurchase(amount: number, invoiceRef?: string) {
    await this.page.getByPlaceholder(/monto|valor|precio/i).fill(String(amount))

    if (invoiceRef) {
      const invoiceField = this.page.getByPlaceholder(/factura|referencia|invoice/i)
      if (await invoiceField.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await invoiceField.fill(invoiceRef)
      }
    }

    await this.page.getByRole('button', { name: /registrar|confirmar/i }).click()
  }

  async getPointsEarned(): Promise<number> {
    // Mensaje de éxito con puntos ganados
    const successMsg = this.page.locator('[class*="green"]').filter({ hasText: /\+\d+|puntos/i })
    await expect(successMsg).toBeVisible({ timeout: 8_000 })
    const text = await successMsg.textContent()
    const match = text?.match(/\+?(\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  async assertSuccess() {
    await expect(
      this.page.locator('[class*="green"]').filter({ hasText: /registrada|exitosa|correctamente/i })
    ).toBeVisible({ timeout: 8_000 })
  }
}
