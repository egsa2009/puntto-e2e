#!/usr/bin/env python3
"""
E2E Record Script — Usa playwright codegen para grabar acciones del usuario y guardarlas en JSON.
Uso: python3 record.py --url <URL> --output pasos.json
"""

import argparse
import ast
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path


CODEGEN_TO_STEPS_MAP = {
    "goto": "goto",
    "click": "click",
    "fill": "fill",
    "select_option": "select",
    "press": "press",
    "hover": "hover",
    "check": "click",
    "uncheck": "click",
}


def parse_python_codegen(code: str, base_url: str) -> list:
    """Parsea el código Python generado por playwright codegen y extrae pasos en formato JSON."""
    steps = []
    lines = code.split("\n")

    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue

        # goto
        m = re.search(r'page\.goto\(["\']([^"\']+)["\']\)', line)
        if m:
            steps.append({"action": "goto", "value": m.group(1), "description": f"Navegar a {m.group(1)}"})
            continue

        # click
        m = re.search(r'page\.(?:get_by_\w+\(.*?\)|locator\(["\']([^"\']+)["\']\))\.click\(\)', line)
        if m:
            selector = m.group(1) or _extract_selector(line)
            steps.append({"action": "click", "selector": selector, "description": f"Clic en '{selector}'"})
            continue

        # fill
        m = re.search(r'\.fill\(["\']([^"\']*?)["\']\)', line)
        if m:
            selector = _extract_selector(line)
            steps.append({"action": "fill", "selector": selector, "value": m.group(1), "description": f"Escribir en '{selector}'"})
            continue

        # select_option
        m = re.search(r'\.select_option\(["\']([^"\']+)["\']\)', line)
        if m:
            selector = _extract_selector(line)
            steps.append({"action": "select", "selector": selector, "value": m.group(1), "description": f"Seleccionar '{m.group(1)}' en '{selector}'"})
            continue

        # press
        m = re.search(r'\.press\(["\']([^"\']+)["\']\)', line)
        if m:
            steps.append({"action": "press", "value": m.group(1), "description": f"Presionar tecla '{m.group(1)}'"})
            continue

    # Agregar screenshot al final
    if steps:
        steps.append({"action": "screenshot", "description": "Captura final"})

    return steps


def _extract_selector(line: str) -> str:
    """Intenta extraer el selector de una línea de código."""
    m = re.search(r'locator\(["\']([^"\']+)["\']\)', line)
    if m:
        return m.group(1)
    m = re.search(r'get_by_role\(["\']([^"\']+)["\'].*?name=["\']([^"\']+)["\']\)', line)
    if m:
        return f"[role={m.group(1)}][name={m.group(2)}]"
    m = re.search(r'get_by_label\(["\']([^"\']+)["\']\)', line)
    if m:
        return f"[label={m.group(1)}]"
    m = re.search(r'get_by_placeholder\(["\']([^"\']+)["\']\)', line)
    if m:
        return f"[placeholder={m.group(1)}]"
    m = re.search(r'get_by_text\(["\']([^"\']+)["\']\)', line)
    if m:
        return f"text={m.group(1)}"
    return "desconocido"


def record(url: str, output: str):
    print(f"\n🎬 Iniciando grabación en: {url}")
    print("─" * 60)
    print("  1. Se abrirá una ventana del navegador")
    print("  2. Navega y realiza las acciones que quieres grabar")
    print("  3. Cierra el navegador cuando termines")
    print("─" * 60)

    with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w") as tmp:
        tmp_path = tmp.name

    try:
        env = os.environ.copy()
        env["DISPLAY"] = env.get("DISPLAY", ":0")

        result = subprocess.run(
            [sys.executable, "-m", "playwright", "codegen",
             "--target", "python",
             "--output", tmp_path,
             url],
            env=env,
            timeout=600,  # 10 min máximo de grabación
        )

        if not Path(tmp_path).exists() or Path(tmp_path).stat().st_size == 0:
            print("\n❌ No se grabó ninguna acción. Asegúrate de cerrar el navegador después de interactuar.")
            sys.exit(1)

        with open(tmp_path, "r", encoding="utf-8") as f:
            code = f.read()

        print(f"\n✅ Grabación completada. Parseando acciones...")
        steps = parse_python_codegen(code, url)

        if not steps:
            print("⚠️  No se pudieron parsear pasos del código generado.")
            print("   Código generado guardado en:", tmp_path)
            sys.exit(1)

        output_data = {"url": url, "steps": steps, "raw_codegen": tmp_path}
        Path(output).parent.mkdir(parents=True, exist_ok=True)
        with open(output, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)

        print(f"✅ {len(steps)} pasos guardados en: {output}")
        for i, s in enumerate(steps, 1):
            print(f"   {i}. [{s['action']}] {s['description']}")

    except subprocess.TimeoutExpired:
        print("\n⏱️ Timeout: la grabación superó los 10 minutos.")
        sys.exit(1)
    except FileNotFoundError:
        print("\n❌ playwright no encontrado. Ejecuta: pip install playwright && playwright install chromium")
        sys.exit(1)
    finally:
        # No borrar tmp para que el usuario pueda inspeccionar el código raw
        pass


def main():
    parser = argparse.ArgumentParser(description="E2E Recorder — graba acciones del navegador")
    parser.add_argument("--url", required=True, help="URL donde iniciar la grabación")
    parser.add_argument("--output", default="./steps.json", help="Archivo JSON de salida con los pasos")
    args = parser.parse_args()
    record(args.url, args.output)


if __name__ == "__main__":
    main()
