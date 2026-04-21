#!/usr/bin/env python3
"""
Translation script using OpenRouter API.

Usage:
    OPENROUTER_API_KEY=sk-or-xxx python scripts/translate_locales.py

Requires OPENROUTER_API_KEY environment variable.
Translates frontend/public/locales/en.json into ru, es, zh.
"""

import json
import os
import sys
from pathlib import Path
import httpx

API_KEY = os.getenv("OPENROUTER_API_KEY", "")
API_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "openai/gpt-4o-mini"

# Target languages with their native names for context
TARGETS = {
    "ru": "Russian (Русский)",
    "es": "Spanish (Español)",
    "zh": "Chinese Simplified (简体中文)",
}

LOCALES_DIR = Path(__file__).parent.parent / "frontend" / "public" / "locales"


def translate_batch(texts: list[str], target_lang: str, target_name: str) -> list[str]:
    """Translate a batch of strings using OpenRouter."""
    if not API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    joined = "\n---\n".join(f"[{i}] {t}" for i, t in enumerate(texts))

    prompt = (
        f"You are a professional translator translating UI strings for a crypto/finance analytics platform.\n"
        f"Translate the following texts from English to {target_name}.\n"
        f"Rules:\n"
        f"1. Keep placeholders like {{terms}} or {{value}} unchanged.\n"
        f"2. Keep technical terms (MVRV, NUPL, EMA, VAH, VAL, POC, OI, P&L) in English or use standard local abbreviations.\n"
        f"3. Use formal but friendly tone suitable for a financial app.\n"
        f"4. Keep HTML/JSX formatting intact.\n"
        f"5. Return ONLY the translations, one per line, prefixed with [N].\n\n"
        f"Texts to translate:\n{joined}\n\n"
        f"Translations:"
    )

    resp = httpx.post(
        API_URL,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://crypto-signals-chi.vercel.app",
        },
        json={
            "model": MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 4000,
            "temperature": 0.3,
        },
        timeout=120,
    )
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]

    # Parse [N] or [N0] translations
    results = [""] * len(texts)
    for line in content.splitlines():
        line = line.strip()
        if line.startswith("[") and "]" in line:
            try:
                idx_str, text = line.split("]", 1)
                idx_str = idx_str[1:]  # remove leading [
                if idx_str.startswith("N"):
                    idx_str = idx_str[1:]
                idx = int(idx_str)
                if 0 <= idx < len(texts):
                    results[idx] = text.strip()
            except ValueError:
                continue
    return results


def load_json(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: dict):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    if not API_KEY:
        print("ERROR: OPENROUTER_API_KEY environment variable is not set.")
        print("Set it with: export OPENROUTER_API_KEY=sk-or-xxx")
        sys.exit(1)

    en_path = LOCALES_DIR / "en.json"
    en_data = load_json(en_path)
    en_keys = list(en_data.keys())

    for code, name in TARGETS.items():
        target_path = LOCALES_DIR / f"{code}.json"
        target_data = load_json(target_path) if target_path.exists() else {}

        missing_keys = [k for k in en_keys if k not in target_data or not target_data[k] or target_data[k] == en_data[k]]

        if not missing_keys:
            print(f"[{code}] All keys present. Nothing to translate.")
            continue

        print(f"[{code}] Translating {len(missing_keys)} missing keys...")

        missing_texts = [en_data[k] for k in missing_keys]
        # Translate in batches of 20 to avoid token limits
        batch_size = 20
        translations = []
        for i in range(0, len(missing_texts), batch_size):
            batch = missing_texts[i : i + batch_size]
            print(f"  Batch {i//batch_size + 1}/{(len(missing_texts)-1)//batch_size + 1} ({len(batch)} items)...")
            try:
                batch_results = translate_batch(batch, code, name)
                translations.extend(batch_results)
            except Exception as e:
                print(f"  ERROR in batch: {e}")
                translations.extend(batch)  # fallback: keep English

        for k, tr in zip(missing_keys, translations):
            target_data[k] = tr or en_data[k]

        # Ensure key order matches en.json
        ordered = {k: target_data.get(k, en_data[k]) for k in en_keys}
        save_json(target_path, ordered)
        print(f"[{code}] Saved {target_path}")

    print("Done!")


if __name__ == "__main__":
    main()
