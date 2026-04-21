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
    // NOTE: La UI actual no tiene botón de eliminar — las promociones se borran
    // directamente en Supabase desde el teardown. Este método existe por si se
    // añade la funcionalidad en el futuro.
    const card = this.page.locator('div[class*="rounded-2xl"]').filter({ hasText: name })
    const deleteBtn = card.getByRole('button', { name: /eliminar|borrar/i })
    if (await deleteBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await deleteBtn.click()
      const confirmBtn = this.page.getByRole('button', { name: /confirmar|si|eliminar/i })
      if (await confirmBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await confirmBtn.click()
      }
      await expect(this.page.getByText(name)).not.toBeVisible({ timeout: 5_000 })
    }
  }

  async togglePromotion(name: string) {
    // Las tarjetas de promoción tienen dos botones: [0] editar, [1] activar/desactivar.
    // El botón de toggle solo tiene icono (ToggleLeft / ToggleRight), sin texto.
    const card = this.page.locator('div[class*="rounded-2xl"]').filter({ hasText: name })
    await card.locator('button').nth(1).click()
  }

  async getPromotionCount(): Promise<number> {
    // Cada tarjeta de promoción contiene botones (editar + toggle).
    // La tarjeta vacía ("No hay promociones") no tiene botones → se excluye sola.
    return await this.page
      .locator('div[class*="rounded-2xl"]')
      .filter({ has: this.page.locator('button') })
      .count()
  }
}
