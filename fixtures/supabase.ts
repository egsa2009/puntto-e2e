/**
 * Cliente Supabase con service_role para setup/teardown de pruebas.
 * Bypasea RLS — úsalo SOLO en global.setup y global.teardown.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_KEY!

if (!url || !key) {
  throw new Error(
    'Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env.test\n' +
    'Copia .env.example a .env.test y completa los valores.'
  )
}

export const adminClient = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Helpers de limpieza ────────────────────────────────────────────────────

/** Elimina todas las transacciones y redemptions de prueba del tenant */
export async function cleanTestData(tenantId: string) {
  // Orden importa por foreign keys
  await adminClient.from('redemptions')
    .delete()
    .eq('tenant_id', tenantId)
    .like('value_description', 'E2E_%')

  await adminClient.from('point_transactions')
    .delete()
    .eq('tenant_id', tenantId)
    .like('notes', 'E2E_%')

  await adminClient.from('promotions')
    .delete()
    .eq('tenant_id', tenantId)
    .like('name', 'E2E_%')
}

/** Obtiene el tenant_id a partir del slug */
export async function getTenantId(slug: string): Promise<string> {
  const { data, error } = await adminClient
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (error || !data) throw new Error(`Tenant con slug "${slug}" no encontrado`)
  return data.id
}
