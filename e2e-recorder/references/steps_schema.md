# Esquema de Pasos (steps.json)

## Estructura raíz

```json
{
  "url": "https://mi-app.com",
  "steps": [ ... ]
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `url` | string | Sí | URL base de la prueba |
| `steps` | array | Sí | Lista de pasos a ejecutar |

---

## Estructura de cada paso

```json
{
  "action": "click",
  "selector": "#submit-btn",
  "value": "",
  "description": "Clic en botón enviar",
  "stop_on_fail": false
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `action` | string | Sí | Tipo de acción (ver tabla abajo) |
| `selector` | string | Según acción | Selector CSS del elemento |
| `value` | string | Según acción | Valor a usar (texto, URL, tecla) |
| `description` | string | No | Texto legible que aparece en el reporte |
| `stop_on_fail` | boolean | No | Si es `true`, detiene la prueba al fallar este paso |

---

## Acciones disponibles

### Navegación
| Acción | Selector | Value | Ejemplo |
|--------|----------|-------|---------|
| `goto` | No | URL completa | `{"action":"goto","value":"https://app.com/login"}` |
| `assert_url` | No | Fragmento de URL esperado | `{"action":"assert_url","value":"/dashboard"}` |

### Interacción
| Acción | Selector | Value | Ejemplo |
|--------|----------|-------|---------|
| `click` | CSS selector | No | `{"action":"click","selector":"button[type=submit]"}` |
| `fill` | CSS selector | Texto a escribir | `{"action":"fill","selector":"#email","value":"test@mail.com"}` |
| `select` | CSS selector | Opción a seleccionar | `{"action":"select","selector":"#pais","value":"Colombia"}` |
| `press` | No | Tecla (e.g. `Enter`, `Tab`, `Escape`) | `{"action":"press","value":"Enter"}` |
| `hover` | CSS selector | No | `{"action":"hover","selector":".dropdown-menu"}` |
| `scroll` | CSS selector | No | `{"action":"scroll","selector":"#tabla-resultados"}` |

### Espera
| Acción | Selector | Value | Ejemplo |
|--------|----------|-------|---------|
| `wait_for` | CSS selector | No | `{"action":"wait_for","selector":".loading-spinner"}` |

### Aserciones (verificaciones)
| Acción | Selector | Value | Ejemplo |
|--------|----------|-------|---------|
| `assert_visible` | CSS selector | No | `{"action":"assert_visible","selector":".alert-success"}` |
| `assert_text` | CSS selector | Texto esperado (parcial) | `{"action":"assert_text","selector":"h1","value":"Bienvenido"}` |

### Utilidades
| Acción | Selector | Value | Ejemplo |
|--------|----------|-------|---------|
| `screenshot` | No | No | `{"action":"screenshot","description":"Captura del estado actual"}` |

---

## Ejemplo completo: Flujo de Login

```json
{
  "url": "https://mi-app.com",
  "steps": [
    {
      "action": "goto",
      "value": "https://mi-app.com/login",
      "description": "Ir a la página de login"
    },
    {
      "action": "assert_visible",
      "selector": "#login-form",
      "description": "Verificar que aparece el formulario de login"
    },
    {
      "action": "fill",
      "selector": "input[name=email]",
      "value": "usuario@empresa.com",
      "description": "Ingresar email"
    },
    {
      "action": "fill",
      "selector": "input[name=password]",
      "value": "MiPassword123",
      "description": "Ingresar contraseña"
    },
    {
      "action": "click",
      "selector": "button[type=submit]",
      "description": "Clic en Iniciar Sesión",
      "stop_on_fail": true
    },
    {
      "action": "wait_for",
      "selector": ".dashboard-container",
      "description": "Esperar que cargue el dashboard"
    },
    {
      "action": "assert_url",
      "value": "/dashboard",
      "description": "Verificar redirección al dashboard"
    },
    {
      "action": "assert_text",
      "selector": ".user-greeting",
      "value": "usuario",
      "description": "Verificar saludo al usuario"
    },
    {
      "action": "screenshot",
      "description": "Captura del dashboard tras login exitoso"
    }
  ]
}
```

---

## Tips para selectores robustos

Preferir en este orden:
1. `#id` — más estable
2. `[data-testid=valor]` — semántico para testing
3. `input[name=campo]` — por atributo name
4. `button[type=submit]` — por tipo
5. `text=Texto visible` — por contenido
6. `.clase` — solo si es única y estable

Evitar: selectores con índices numéricos (`div:nth-child(3)`) o estructurales muy específicos que cambian con el layout.
