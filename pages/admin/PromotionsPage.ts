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

    // El modal es un div.fixed.inset-0 (no role="dialog"), esperar que aparezca
    const modal = this.page.locator('[class*="fixed"][class*="inset-0"]').filter({
      has: this.page.locator('form'),
    }).first()
    await expect(modal).toBeVisible({ timeout: 3_000 })

    // Placeholder real del campo nombre: "Ej: Cafe gratis"
    await modal.getByPlaceholder(/ej:/i).fill(data.name)

    if (data.description) {
      await modal.getByPlaceholder(/describe/i).fill(data.description)
    }

    // Puntos requeridos — primer input type="number" del modal
    const pointsInput = modal.locator('input[type="number"]').first()
    await pointsInput.fill(String(data.pointsRequired))

    if (data.stock !== undefined) {
      // Stock — segundo input type="number"
      const stockInput = modal.locator('input[type="number"]').nth(1)
      await stockInput.fill(String(data.stock))
    }

    await modal.getByRole('button', { name: /guardar|crear/i }).click()

    // Verificar que aparece en la lista
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
