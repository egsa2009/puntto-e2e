import { type Page, expect } from '@playwright/test'

export interface CashierData {
  fullName: string
  email:    string
  password: string
}

export class AdminStaffPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/staff')
    await expect(this.page.getByRole('heading', { name: /cajero/i })).toBeVisible()
  }

  /** Devuelve el número de cajeros listados */
  async getCashierCount(): Promise<number> {
    // Esperar a que cargue la lista
    await this.page.waitForTimeout(500)
    const rows = this.page.locator('table tbody tr, [data-testid="cashier-row"]')
    return await rows.count()
  }

  /** Crea un nuevo cajero POS y retorna sus credenciales desde el modal de éxito */
  async createCashier(data: CashierData): Promise<{ name: string; email: string } | null> {
    const createBtn = this.page.getByRole('button', { name: /nuevo cajero|crear cajero/i })
    await createBtn.click()

    // Esperar modal
    const modal = this.page.locator('[class*="fixed inset"]').filter({ hasText: /cajero/i }).first()
    await expect(modal).toBeVisible({ timeout: 3_000 })

    await modal.getByLabel(/nombre/i).fill(data.fullName)
    await modal.getByLabel(/correo|email/i).fill(data.email)
    await modal.getByLabel(/contraseña/i).fill(data.password)

    await modal.getByRole('button', { name: /crear|guardar/i }).click()

    // Esperar resultado — puede ser un modal de éxito con las credenciales
    const successPanel = this.page.locator('[class*="bg-green"], [class*="success"]').first()
    const visible = await successPanel.isVisible({ timeout: 8_000 }).catch(() => false)

    if (visible) {
      const text = await successPanel.textContent()
      return { name: data.fullName, email: data.email }
    }

    // Alternativo: el nombre aparece en la tabla
    await expect(this.page.getByText(data.fullName)).toBeVisible({ timeout: 8_000 })
    return { name: data.fullName, email: data.email }
  }

  /** Activa o desactiva un cajero por nombre */
  async toggleCashier(name: string) {
    const row = this.page.locator('tr').filter({ hasText: name })
    const toggleBtn = row.getByRole('button', { name: /activar|desactivar/i })
    await toggleBtn.click()

    // Confirmar si hay modal
    const confirmBtn = this.page.getByRole('button', { name: /confirmar|sí|si/i })
    if (await confirmBtn.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await confirmBtn.click()
    }
  }

  /** Verifica que un cajero aparezca como inactivo */
  async isCashierInactive(name: string): Promise<boolean> {
    const row = this.page.locator('tr').filter({ hasText: name })
    const inactive = row.locator('[class*="inactiv"], [class*="red"]').first()
    return await inactive.isVisible().catch(() => false)
  }
}
