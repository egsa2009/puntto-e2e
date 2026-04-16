# Puntto E2E — Guía de Instalación y Uso

## 1. Instalar dependencias

```bash
cd puntto-e2e
npm install
npx playwright install chromium
```

## 2. Crear proyecto Supabase de test (recomendado)

1. Ve a https://supabase.com y crea un nuevo proyecto llamado **puntto-test**
2. En el SQL Editor, corre todas las migraciones en orden:
   - `puntto-db/migrations/004_add_redemptions.sql`
   - `puntto-db/migrations/005_fix_redemptions.sql`
   - ... hasta la última migración
3. Crea manualmente:
   - Un tenant (row en tabla `tenants` con un `slug`)
   - Un usuario admin (`role = 'admin'`)
   - Un usuario cajero (`role = 'employee'` con `franchise_id` y `pos_terminal_id`)
   - Un usuario cliente (`role = 'customer'` con puntos suficientes para canjear)

## 3. Configurar .env.test

```bash
cp .env.example .env.test
```

Edita `.env.test` con los valores de tu proyecto Supabase de test:

```env
SUPABASE_URL=https://tu-proyecto-test.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...   # service_role key (NO la anon key)

TEST_SLUG=momotea                   # slug de tu tenant de prueba

TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=TuPassword123!

TEST_CASHIER_EMAIL=cajero@test.com
TEST_CASHIER_PASSWORD=TuPassword123!

TEST_CLIENT_EMAIL=cliente@test.com
TEST_CLIENT_PASSWORD=TuPassword123!
TEST_CLIENT_QR=el_qr_code_del_cliente   # valor del campo qr_code en profiles

# URLs (ajusta si usas otros puertos o deploys)
ADMIN_URL=http://localhost:5174
CLIENT_URL=http://localhost:5173
POS_URL=http://localhost:5175
```

### ¿Dónde encuentro TEST_CLIENT_QR?

En Supabase, ve a Table Editor → profiles → busca tu usuario cliente → copia el valor del campo `qr_code`.

## 4. Levantar las apps en local

En terminales separadas:

```bash
# Terminal 1
cd puntto-client && npm run dev    # puerto 5173

# Terminal 2
cd puntto-admin  && npm run dev    # puerto 5174

# Terminal 3
cd puntto-pos    && npm run dev    # puerto 5175
```

## 5. Correr las pruebas

```bash
# Todas las pruebas
npm test

# Solo una app
npm run test:admin
npm run test:client
npm run test:pos

# Con UI visual (ver el navegador)
npm run test:headed

# Ver reporte HTML
npm run test:report
```

## 6. ¿Qué prueba qué?

| Spec | Qué verifica |
|------|-------------|
| `tests/admin/promotions.spec.ts` | CRUD de promociones en panel admin |
| `tests/client/benefits.spec.ts` | App cliente es solo informativa (sin botón de canjear) |
| `tests/pos/purchase.spec.ts` | Registrar compra y acumular puntos |
| `tests/pos/redeem.spec.ts` | Canje de promociones, anti-doble-canje, puntos insuficientes |

## 7. Agregar más pruebas

Usa los Page Object Models en `pages/` para no repetir selectores.
Prefija todos los datos de prueba con `E2E_` para que el teardown los limpie.

```typescript
// Ejemplo
const promo = await adminClient.from('promotions').insert({
  name: `E2E_MiPrueba_${Date.now()}`,
  // ...
})
```
