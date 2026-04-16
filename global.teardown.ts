/**
 * global.teardown.ts
 * Corre UNA VEZ al final de toda la suite.
 * Elimina todos los registros marcados con "E2E_" dejando el Supabase limpio.
 */
import { test as teardown } from '@playwright/test'
import { cleanTestData, getTenantId } from './fixtures/supabase'

const SLUG = process.env.TEST_SLUG || 'momotea'

teardown('limpiar todos los datos E2E', async () => {
  const tenantId = await getTenantId(SLUG)
  await cleanTestData(tenantId)
  console.log('✅ Teardown completo — Supabase limpio')
})
