import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '.env.test') })

// Crear directorio .auth y archivos placeholder vacíos en tiempo de carga
// para que Playwright no falle antes de que global.setup los genere con
// sesiones reales.
const authDir = path.resolve(__dirname, '.auth')
fs.mkdirSync(authDir, { recursive: true })
const emptyState = JSON.stringify({ cookies: [], origins: [] })
for (const name of ['admin', 'client', 'pos']) {
  const filePath = path.join(authDir, `${name}.json`)
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, emptyState)
  }
}

const ADMIN_URL  = process.env.ADMIN_URL  || 'http://localhost:5174'
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const POS_URL    = process.env.POS_URL    || 'http://localhost:5175'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,       // secuencial para no tener race conditions en Supabase
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                 // un worker para mantener orden en datos de prueba
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    trace:       'on-first-retry',
    screenshot:  'only-on-failure',
    video:       'on-first-retry',
    locale:      'es-CO',
    timezoneId:  'America/Bogota',
  },

  projects: [
    // ── Setup global: crea tenant + usuarios de prueba ──────────────
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },

    // ── Admin ────────────────────────────────────────────────────────
    {
      name: 'admin',
      testDir: './tests/admin',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: ADMIN_URL,
        storageState: '.auth/admin.json',
      },
    },

    // ── Client (mobile) ──────────────────────────────────────────────
    {
      name: 'client',
      testDir: './tests/client',
      dependencies: ['setup'],
      use: {
        ...devices['Pixel 7'],
        baseURL: CLIENT_URL,
        storageState: '.auth/client.json',
      },
    },

    // ── POS (desktop) ────────────────────────────────────────────────
    {
      name: 'pos',
      testDir: './tests/pos',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: POS_URL,
        storageState: '.auth/pos.json',
      },
    },

    // ── Teardown global: limpia datos de prueba ──────────────────────
    {
      name: 'teardown',
      testMatch: /global\.teardown\.ts/,
      dependencies: ['admin', 'client', 'pos'],
    },
  ],
})
