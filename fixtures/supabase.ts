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

/** Elimina todos los datos de prueba E2E del tenant */
export async function cleanTestData(tenantId: string) {
  // Orden importa por foreign keys

  // Redemptions y transacciones
  await adminClient.from('redemptions')
    .delete()
    .eq('tenant_id', tenantId)
    .like('value_description', 'E2E_%')

  await adminClient.from('point_transactions')
    .delete()
    .eq('tenant_id', tenantId)
    .like('notes', 'E2E_%')

  // Promociones
  await adminClient.from('promotions')
    .delete()
    .eq('tenant_id', tenantId)
    .like('name', 'E2E_%')

  // Campañas push
  await adminClient.from('campaigns')
    .delete()
    .eq('tenant_id', tenantId)
    .like('title', 'E2E_%')

  // Perfiles de cajeros POS creados en tests (role='employee')
  // Solo eliminamos los que tienen email con prefijo e2e_
  const { data: staffUsers } = await adminClient.auth.admin.listUsers()
  const e2eEmails = (staffUsers?.users || [])
    .filter(u => u.email?.startsWith('e2e_cajero'))
    .map(u => u.id)

  if (e2eEmails.length > 0) {
    await adminClient.from('profiles')
      .delete()
      .eq('tenant_id', tenantId)
      .in('id', e2eEmails)

    for (const uid of e2eEmails) {
      await adminClient.auth.admin.deleteUser(uid)
    }
  }
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
