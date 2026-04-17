import { type Page, expect } from '@playwright/test'

export interface CampaignData {
  title:   string
  body:    string
  segment?: string   // id del segmento, default 'all'
}

export class AdminCampaignsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/campaigns')
    // Use exact match to avoid strict-mode violation with h3 "Historial de campanas"
    await expect(this.page.getByRole('heading', { name: 'Campanas', exact: true })).toBeVisible()
  }

  /** Devuelve el texto del banner de límite mensual, o null si no existe */
  async getLimitBannerText(): Promise<string | null> {
    const banner = this.page.locator('[class*="rounded-xl"]').filter({
      hasText: /usadas este mes|límite alcanzado/i,
    }).first()
    const visible = await banner.isVisible().catch(() => false)
    return visible ? (await banner.textContent()) : null
  }

  /** True si el botón de envío está deshabilitado por límite */
  async isSendBlocked(): Promise<boolean> {
    const btn = this.page.getByRole('button', { name: /límite mensual|enviar/i })
    const disabled = await btn.getAttribute('disabled')
    const text = await btn.textContent()
    return disabled !== null || (text?.toLowerCase().includes('límite') ?? false)
  }

  async createCampaign(data: CampaignData) {
    // Limpiar y rellenar título
    const titleInput = this.page.getByPlaceholder(/título de la notif/i)
    await titleInput.clear()
    await titleInput.fill(data.title)

    // Limpiar y rellenar cuerpo
    const bodyInput = this.page.getByPlaceholder(/contenido de la notif/i)
    await bodyInput.clear()
    await bodyInput.fill(data.body)

    // Seleccionar segmento si se especifica
    if (data.segment && data.segment !== 'all') {
      const segBtn = this.page.locator('button').filter({ hasText: data.segment }).first()
      if (await segBtn.isVisible()) await segBtn.click()
    }

    // Enviar
    const sendBtn = this.page.getByRole('button', { name: /enviar a/i })
    await sendBtn.click()
  }

  /** Cuenta las campañas en el historial */
  async getHistoryCount(): Promise<number> {
    const toggle = this.page.getByRole('button', { name: /historial/i })
    await toggle.click()
    await this.page.waitForTimeout(500)
    // Cada entrada del historial tiene una fecha
    return await this.page.locator('[class*="divide-y"] > div').count()
  }
}
