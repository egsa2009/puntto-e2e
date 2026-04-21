---
name: e2e-recorder
description: >
  Graba y reproduce pruebas end-to-end (E2E) en el navegador usando Playwright.
  Usa este skill cuando el usuario quiera: grabar pasos de navegación en una URL para convertirlos
  en una prueba automatizada, reproducir una prueba grabada y obtener un reporte de éxito/fallo,
  ejecutar pasos de prueba descritos en lenguaje natural sobre una web, o verificar que ciertos
  flujos de una aplicación web siguen funcionando correctamente. Activa este skill ante frases como
  "graba los pasos", "prueba esta URL", "ejecuta el flujo", "reproduce la prueba", "verifica que
  funcione", "haz una prueba E2E", "automatiza estos pasos", o cuando el usuario mencione querer
  probar una aplicación web paso a paso.
---

# E2E Recorder Skill

Skill para grabar y reproducir pruebas end-to-end usando **Playwright + Chromium**.

## Flujo principal

Este skill tiene dos modos:

### MODO 1 — Grabación (`record`)
El usuario navega por su cuenta en una ventana del navegador mientras Playwright `codegen` graba cada acción. Al cerrar, se guarda el script.

### MODO 2 — Reproducción (`replay`)
Se ejecuta el script grabado (o uno descrito en lenguaje natural) en modo headless, capturando screenshots en cada paso. Se genera un reporte HTML con resultado por paso, captura de pantalla en fallos, y resumen final.

---

## Pasos de ejecución

### Paso 1 — Determinar modo

Pregunta al usuario si quiere:
- **Grabar** una sesión nueva (MODO 1)
- **Reproducir** una prueba ya grabada o descrita (MODO 2)
- **Grabar y luego reproducir** en el mismo flujo

### Paso 2A — Grabación

Ejecuta el script de grabación:

```bash
python3 /home/claude/e2e-recorder/scripts/record.py --url "<URL>" --output "<ruta_salida.json>"
```

Esto lanza `playwright codegen` en modo headed (ventana visible). El usuario realiza sus acciones. Al cerrar el navegador, el script guarda los pasos en un archivo JSON.

> ⚠️ La grabación requiere entorno gráfico (display). En Cowork esto funciona. En entornos headless, ofrecer al usuario describir los pasos en lenguaje natural en su lugar.

### Paso 2B — Reproducción

Ejecuta el script de reproducción:

```bash
python3 /home/claude/e2e-recorder/scripts/replay.py --steps "<ruta_pasos.json>" --output "<ruta_reporte>"
```

O para pasos en lenguaje natural generados por Claude, primero convertir con:

```bash
python3 /home/claude/e2e-recorder/scripts/nl_to_steps.py --description "<descripcion>" --url "<url>" --output "<ruta_pasos.json>"
```

### Paso 3 — Reporte

El script `replay.py` genera:
- `report.html` — reporte visual con tabla de pasos, estado (✅/❌), tiempo de ejecución y capturas de pantalla embebidas en base64
- `report.json` — datos crudos del reporte para procesamiento adicional
- `screenshots/` — capturas individuales por paso fallido

Presentar el `report.html` al usuario con `present_files`.

---

## Instalación de dependencias

Verificar antes de ejecutar:

```bash
python3 -c "from playwright.sync_api import sync_playwright; print('OK')"
```

Si falla:
```bash
pip install playwright --break-system-packages
playwright install chromium
```

---

## Formato del archivo de pasos (steps.json)

Ver `references/steps_schema.md` para el esquema completo.

Ejemplo mínimo:
```json
{
  "url": "https://ejemplo.com",
  "steps": [
    {"action": "goto", "value": "https://ejemplo.com"},
    {"action": "click", "selector": "#login-btn", "description": "Clic en botón Login"},
    {"action": "fill", "selector": "#email", "value": "usuario@test.com", "description": "Llenar email"},
    {"action": "screenshot", "description": "Captura tras llenar email"},
    {"action": "assert_visible", "selector": ".dashboard", "description": "Verificar que aparece el dashboard"}
  ]
}
```

## Acciones soportadas

| Acción | Descripción |
|---|---|
| `goto` | Navegar a URL |
| `click` | Clic en elemento |
| `fill` | Escribir en campo |
| `select` | Seleccionar opción en dropdown |
| `press` | Presionar tecla (e.g. `Enter`) |
| `wait_for` | Esperar a que aparezca selector |
| `screenshot` | Tomar captura en ese momento |
| `assert_visible` | Verificar que elemento es visible |
| `assert_text` | Verificar texto en elemento |
| `assert_url` | Verificar URL actual |
| `hover` | Hover sobre elemento |
| `scroll` | Hacer scroll a elemento |

---

## Manejo de errores comunes

- **Selector no encontrado**: Playwright esperará hasta el timeout (30s por defecto). Si falla, el paso se marca como ❌ con screenshot automático.
- **Sin entorno gráfico para grabación**: Usar modo lenguaje natural + `nl_to_steps.py`.
- **Sitio con autenticación**: Incluir pasos de login al inicio del archivo de pasos.
- **Red no disponible**: Verificar que el entorno tiene acceso a la URL objetivo.
