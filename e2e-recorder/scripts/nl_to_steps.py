#!/usr/bin/env python3
"""
nl_to_steps.py — Convierte una descripción en lenguaje natural a pasos E2E en formato JSON,
usando la API de Claude.
Uso: python3 nl_to_steps.py --description "Ve a login, escribe usuario y contraseña, haz clic en entrar" --url https://app.com --output steps.json
"""

import argparse
import json
import os
import re
import sys
import urllib.request
import urllib.error
from pathlib import Path


SYSTEM_PROMPT = """Eres un experto en automatización de pruebas E2E con Playwright.
Tu tarea es convertir una descripción en lenguaje natural a un array JSON de pasos de prueba.

Responde ÚNICAMENTE con un objeto JSON válido, sin markdown, sin explicaciones, sin backticks.

El formato debe ser exactamente:
{
  "url": "<url_base>",
  "steps": [
    {"action": "goto", "value": "<url>", "description": "Navegar a <url>"},
    {"action": "click", "selector": "<css_selector>", "description": "<descripcion>"},
    {"action": "fill", "selector": "<css_selector>", "value": "<texto>", "description": "<descripcion>"},
    {"action": "assert_visible", "selector": "<css_selector>", "description": "<descripcion>"},
    ...
  ]
}

Acciones disponibles: goto, click, fill, select, press, wait_for, screenshot, assert_visible, assert_text, assert_url, hover, scroll

Para los selectores, usa selectores CSS comunes y robustos como:
- #id para IDs
- .clase para clases
- button[type=submit] para botones
- input[name=email] para campos por nombre
- text=<texto> para elementos por texto visible

Siempre agrega un paso screenshot al final.
Siempre agrega pasos assert_visible para verificar resultados esperados.
"""


def call_claude(url: str, description: str) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        print("❌ Variable de entorno ANTHROPIC_API_KEY no encontrada.")
        print("   Expórtala antes de correr el script:")
        print("   export ANTHROPIC_API_KEY=sk-ant-...")
        sys.exit(1)

    payload = {
        "model": "claude-sonnet-4-6",
        "max_tokens": 1500,
        "system": SYSTEM_PROMPT,
        "messages": [
            {
                "role": "user",
                "content": f"URL base: {url}\n\nDescripción de los pasos a automatizar:\n{description}"
            }
        ]
    }

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    text = "".join(block.get("text", "") for block in data.get("content", []) if block.get("type") == "text")

    # Limpiar posibles backticks
    text = re.sub(r"```(?:json)?", "", text).strip()

    return json.loads(text)


def main():
    parser = argparse.ArgumentParser(description="Convierte lenguaje natural a pasos E2E JSON")
    parser.add_argument("--description", required=True, help="Descripción en lenguaje natural de los pasos")
    parser.add_argument("--url", required=True, help="URL base de la prueba")
    parser.add_argument("--output", default="./steps.json", help="Archivo JSON de salida")
    args = parser.parse_args()

    print(f"🤖 Generando pasos para: {args.url}")
    print(f"   Descripción: {args.description[:80]}...")

    try:
        result = call_claude(args.url, args.description)
    except json.JSONDecodeError as e:
        print(f"❌ Error parseando respuesta de Claude: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error llamando a Claude API: {e}")
        sys.exit(1)

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    steps = result.get("steps", [])
    print(f"✅ {len(steps)} pasos generados en: {args.output}")
    for i, s in enumerate(steps, 1):
        print(f"   {i}. [{s['action']}] {s.get('description', '')}")


if __name__ == "__main__":
    main()
