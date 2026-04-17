/**
 * Helper para inyectar la sesión de Supabase en el navegador ANTES de que
 * corra cualquier JS de la página. Llámalo en un beforeEach de cada spec.
 *
 * page.addInitScript() garantiza que el token esté en localStorage desde
 * el primer instante, antes de que React/Supabase llamen a getSession().
 */
import type { Page } from '@playwright/test'
import * as fs   from 'fs'
import * as path from 'path'

export async function injectAuth(page: Page, role: 'admin' | 'client' | 'pos') {
  const lsFile = path.resolve(__dirname, `../.auth/${role}-ls.json`)

  if (!fs.existsSync(lsFile)) {
    throw new Error(
      `No se encontró ${lsFile}.\n` +
      `Ejecuta primero: npx playwright test --project=setup`
    )
  }

  const items: Array<{ key: string; value: string }> =
    JSON.parse(fs.readFileSync(lsFile, 'utf-8'))

  if (items.length === 0) {
    throw new Error(
      `El archivo ${path.basename(lsFile)} está vacío — el setup no guardó la sesión.\n` +
      `Revisa la salida de: npx playwright test --project=setup`
    )
  }

  await page.addInitScript((lsItems: Array<{ key: string; value: string }>) => {
    for (const { key, value } of lsItems) {
      localStorage.setItem(key, value)
    }
  }, items)
}
