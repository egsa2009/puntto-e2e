#!/usr/bin/env python3
"""
E2E Replay Script — Ejecuta pasos desde un JSON y genera reporte HTML con screenshots.
Uso: python3 replay.py --steps pasos.json --output ./reporte
"""

import argparse
import base64
import json
import os
import sys
import time
import traceback
from datetime import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout


TIMEOUT = 30_000  # 30 segundos por paso


def load_steps(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def screenshot_b64(page) -> str:
    data = page.screenshot(full_page=False)
    return base64.b64encode(data).decode("utf-8")


def run_step(page, step: dict) -> dict:
    action = step.get("action", "").lower()
    selector = step.get("selector", "")
    value = step.get("value", "")
    description = step.get("description", action)
    screenshot_b64_data = None
    error = None
    start = time.time()

    try:
        if action == "goto":
            page.goto(value, timeout=TIMEOUT)
        elif action == "click":
            page.locator(selector).first.click(timeout=TIMEOUT)
        elif action == "fill":
            page.locator(selector).first.fill(value, timeout=TIMEOUT)
        elif action == "select":
            page.locator(selector).first.select_option(value, timeout=TIMEOUT)
        elif action == "press":
            page.keyboard.press(value)
        elif action == "wait_for":
            page.locator(selector).first.wait_for(state="visible", timeout=TIMEOUT)
        elif action == "hover":
            page.locator(selector).first.hover(timeout=TIMEOUT)
        elif action == "scroll":
            page.locator(selector).first.scroll_into_view_if_needed(timeout=TIMEOUT)
        elif action == "screenshot":
            pass  # always captured below on success
        elif action == "assert_visible":
            visible = page.locator(selector).first.is_visible()
            if not visible:
                raise AssertionError(f"Elemento '{selector}' no es visible")
        elif action == "assert_text":
            actual = page.locator(selector).first.inner_text(timeout=TIMEOUT)
            if value not in actual:
                raise AssertionError(f"Texto esperado '{value}' no encontrado en '{actual}'")
        elif action == "assert_url":
            current = page.url
            if value not in current:
                raise AssertionError(f"URL esperada '{value}' no coincide con '{current}'")
        else:
            raise ValueError(f"Acción desconocida: '{action}'")

        # Captura de pantalla en cada paso exitoso
        screenshot_b64_data = screenshot_b64(page)
        status = "pass"

    except (PlaywrightTimeout, AssertionError, ValueError, Exception) as e:
        error = str(e)
        status = "fail"
        try:
            screenshot_b64_data = screenshot_b64(page)
        except Exception:
            screenshot_b64_data = None

    elapsed = round(time.time() - start, 2)

    return {
        "action": action,
        "description": description,
        "selector": selector,
        "value": value,
        "status": status,
        "error": error,
        "elapsed_s": elapsed,
        "screenshot": screenshot_b64_data,
    }


def generate_html_report(results: list, output_dir: Path, meta: dict) -> Path:
    total = len(results)
    passed = sum(1 for r in results if r["status"] == "pass")
    failed = total - passed
    duration = sum(r["elapsed_s"] for r in results)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    rows = ""
    for i, r in enumerate(results, 1):
        status_icon = "✅" if r["status"] == "pass" else "❌"
        status_class = "pass" if r["status"] == "pass" else "fail"
        error_html = f'<div class="error-msg">⚠️ {r["error"]}</div>' if r["error"] else ""
        
        if r["screenshot"]:
            screenshot_html = f'<img class="screenshot" src="data:image/png;base64,{r["screenshot"]}" alt="screenshot paso {i}" />'
        else:
            screenshot_html = '<span class="no-screenshot">Sin captura</span>'

        rows += f"""
        <tr class="{status_class}">
          <td class="step-num">{i}</td>
          <td class="step-desc">
            <strong>{r['description']}</strong>
            <span class="action-badge">{r['action']}</span>
            {f'<code class="selector">{r["selector"]}</code>' if r["selector"] else ""}
            {f'<code class="value">→ {r["value"]}</code>' if r["value"] and r["action"] not in ("goto",) else ""}
            {error_html}
          </td>
          <td class="status-cell">{status_icon}</td>
          <td class="time-cell">{r['elapsed_s']}s</td>
          <td class="screenshot-cell">{screenshot_html}</td>
        </tr>
        """

    overall = "✅ TODOS LOS PASOS PASARON" if failed == 0 else f"❌ {failed} PASO(S) FALLARON"
    overall_class = "overall-pass" if failed == 0 else "overall-fail"

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reporte E2E — {meta.get('url', '')}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f6f9; color: #1a1a2e; }}
  header {{ background: #1a1a2e; color: white; padding: 24px 32px; }}
  header h1 {{ font-size: 22px; font-weight: 700; }}
  header .subtitle {{ font-size: 13px; opacity: 0.7; margin-top: 4px; }}
  .summary {{ display: flex; gap: 16px; padding: 24px 32px; flex-wrap: wrap; }}
  .card {{ background: white; border-radius: 10px; padding: 16px 24px; flex: 1; min-width: 140px;
           box-shadow: 0 2px 8px rgba(0,0,0,0.07); text-align: center; }}
  .card .num {{ font-size: 32px; font-weight: 800; }}
  .card .label {{ font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }}
  .card.pass .num {{ color: #22c55e; }}
  .card.fail .num {{ color: #ef4444; }}
  .card.total .num {{ color: #6366f1; }}
  .overall {{ margin: 0 32px 24px; padding: 16px 20px; border-radius: 10px; font-size: 18px; font-weight: 700; text-align: center; }}
  .overall-pass {{ background: #dcfce7; color: #166534; }}
  .overall-fail {{ background: #fee2e2; color: #991b1b; }}
  .table-wrap {{ margin: 0 32px 40px; overflow-x: auto; }}
  table {{ width: 100%; border-collapse: collapse; background: white; border-radius: 12px;
           overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }}
  th {{ background: #1a1a2e; color: white; padding: 12px 16px; text-align: left; font-size: 12px;
        text-transform: uppercase; letter-spacing: 0.5px; }}
  td {{ padding: 14px 16px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }}
  tr:last-child td {{ border-bottom: none; }}
  tr.fail {{ background: #fff8f8; }}
  tr.pass {{ background: #fafffe; }}
  tr:hover {{ background: #f8f9ff; }}
  .step-num {{ width: 40px; font-weight: 700; color: #888; font-size: 13px; }}
  .action-badge {{ display: inline-block; background: #eef2ff; color: #6366f1;
                   font-size: 11px; border-radius: 4px; padding: 1px 6px; margin-left: 6px;
                   font-family: monospace; }}
  .selector, .value {{ display: block; font-family: monospace; font-size: 12px;
                       color: #666; margin-top: 4px; }}
  .error-msg {{ background: #fee2e2; color: #991b1b; border-radius: 6px; padding: 8px 12px;
                font-size: 12px; margin-top: 8px; border-left: 3px solid #ef4444; }}
  .status-cell {{ width: 50px; text-align: center; font-size: 18px; }}
  .time-cell {{ width: 70px; font-size: 12px; color: #888; white-space: nowrap; }}
  .screenshot-cell {{ width: 220px; }}
  .screenshot {{ width: 200px; border-radius: 6px; border: 1px solid #e5e7eb; cursor: pointer;
                 transition: transform 0.2s; }}
  .screenshot:hover {{ transform: scale(1.05); }}
  .no-screenshot {{ font-size: 11px; color: #bbb; }}
  footer {{ text-align: center; padding: 20px; font-size: 12px; color: #999; }}
</style>
</head>
<body>
<header>
  <h1>🧪 Reporte de Prueba E2E</h1>
  <div class="subtitle">URL: {meta.get('url', 'N/A')} &nbsp;·&nbsp; {now} &nbsp;·&nbsp; Duración total: {round(duration, 2)}s</div>
</header>

<div class="summary">
  <div class="card total"><div class="num">{total}</div><div class="label">Pasos totales</div></div>
  <div class="card pass"><div class="num">{passed}</div><div class="label">Exitosos</div></div>
  <div class="card fail"><div class="num">{failed}</div><div class="label">Fallidos</div></div>
</div>

<div class="overall {overall_class}">{overall}</div>

<div class="table-wrap">
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Descripción del Paso</th>
      <th>Estado</th>
      <th>Tiempo</th>
      <th>Captura</th>
    </tr>
  </thead>
  <tbody>
    {rows}
  </tbody>
</table>
</div>

<footer>Generado por E2E Recorder Skill · Playwright {meta.get('playwright_version', '')} · Chromium</footer>
</body>
</html>"""

    report_path = output_dir / "report.html"
    report_path.write_text(html, encoding="utf-8")
    return report_path


def main():
    parser = argparse.ArgumentParser(description="E2E Replay — ejecuta pasos y genera reporte")
    parser.add_argument("--steps", required=True, help="Ruta al archivo JSON de pasos")
    parser.add_argument("--output", default="./e2e_report", help="Directorio de salida del reporte")
    args = parser.parse_args()

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    data = load_steps(args.steps)
    steps = data.get("steps", [])
    base_url = data.get("url", "")

    print(f"\n🧪 Iniciando reproducción de {len(steps)} pasos sobre: {base_url}")
    print("─" * 60)

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        for i, step in enumerate(steps, 1):
            desc = step.get("description", step.get("action", f"paso {i}"))
            print(f"  [{i}/{len(steps)}] {desc} ...", end=" ", flush=True)
            result = run_step(page, step)
            results.append(result)
            status_str = "✅" if result["status"] == "pass" else f"❌  Error: {result['error']}"
            print(f"{status_str} ({result['elapsed_s']}s)")

            if result["status"] == "fail" and step.get("stop_on_fail", False):
                print("\n⛔ stop_on_fail activado — deteniendo ejecución.")
                break

        browser.close()

    passed = sum(1 for r in results if r["status"] == "pass")
    failed = len(results) - passed

    try:
        import playwright
        pw_version = getattr(playwright, "__version__", "1.x")
    except Exception:
        pw_version = "unknown"
    meta = {"url": base_url, "playwright_version": pw_version}
    report_path = generate_html_report(results, output_dir, meta)

    report_json = output_dir / "report.json"
    report_json.write_text(json.dumps({"meta": meta, "results": [
        {k: v for k, v in r.items() if k != "screenshot"} for r in results
    ]}, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n" + "─" * 60)
    print(f"📊 Resultado: {passed}/{len(results)} pasos exitosos, {failed} fallidos")
    print(f"📄 Reporte HTML: {report_path}")
    print(f"📋 Reporte JSON: {report_json}")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
