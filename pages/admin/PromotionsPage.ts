import { type Page, expect } from '@playwright/test'

export interface PromotionData {
  name:            string
  description?:    string
  pointsRequired:  number
  stock?:          number
}

export class AdminPromotionsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/promotions')
    await expect(this.page.getByRole('heading', { name: /promoci/i })).toBeVisible()
  }

  async createPromotion(data: PromotionData) {
    await this.page.getByRole('button', { name: /nueva promoci|agregar/i }).click()

    const dialog = this.page.getByRole('dialog').or(
      this.page.locator('form').filter({ hasText: /nombre/i })
    )

    await dialog.getByPlaceholder(/nombre/i).fill(data.name)

    if (data.description) {
      await dialog.getByPlaceholder(/descripci/i).fill(data.description)
    }

    await dialog.getByLabel(/puntos requeridos|puntos necesarios/i).fill(
      String(data.pointsRequired)
    )

    if (data.stock !== undefined) {
      await dialog.getByLabel(/stock/i).fill(String(data.stock))
    }

    await dialog.getByRole('button', { name: /guardar|crear/i }).click()

    // Verificar que aparece en la tabla
    await expect(
      this.page.getByText(data.name)
    ).toBeVisible({ timeout: 5_000 })
  }

  async deletePromotion(name: string) {
    const row = this.page.locator('tr, [data-testid="promo-card"]').filter({ hasText: name })
    await row.getByRole('button', { name: /eliminar|borrar/i }).click()

    // Confirmar si hay dialogo
    const confirmBtn = this.page.getByRole('button', { name: /confirmar|si|eliminar/i })
    if (await confirmBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await confirmBtn.click()
    }

    await expect(this.page.getByText(name)).not.toBeVisible({ timeout: 5_000 })
  }

  async togglePromotion(name: string) {
    const row = this.page.locator('tr, [data-testid="promo-card"]').filter({ hasText: name })
    await row.getByRole('button', { name: /activar|desactivar|toggle/i }).click()
  }

  async getPromotionCount(): Promise<number> {
    return await this.page.locator('tr[data-testid], .promo-card, tbody tr').count()
  }
}
