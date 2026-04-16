import { type Page, expect } from '@playwright/test'

export class AdminLoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login')
  }

  async login(email: string, password: string) {
    await this.page.getByPlaceholder(/correo|email/i).fill(email)
    await this.page.getByPlaceholder(/contraseña|password/i).fill(password)
    await this.page.getByRole('button', { name: /iniciar sesion|entrar/i }).click()
    await expect(this.page).toHaveURL(/dashboard|overview/, { timeout: 10_000 })
  }

  async logout() {
    await this.page.getByRole('button', { name: /salir|logout/i }).click()
    await expect(this.page).toHaveURL(/login/)
  }
}
