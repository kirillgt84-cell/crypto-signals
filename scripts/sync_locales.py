#!/usr/bin/env python3
"""
Sync locale files: ensure all target files have the same keys as en.json.
Missing keys are filled with the English fallback value and marked with [TRANSLATE].
"""

import json
from pathlib import Path

LOCALES_DIR = Path(__file__).parent.parent / "frontend" / "public" / "locales"
TARGETS = ["ru", "es", "zh"]


def load(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save(path: Path, data: dict):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    en = load(LOCALES_DIR / "en.json")
    for code in TARGETS:
        path = LOCALES_DIR / f"{code}.json"
        target = load(path) if path.exists() else {}
        updated = {}
        changed = 0
        for k, v in en.items():
            if k in target and target[k] and not target[k].startswith("[TRANSLATE]"):
                updated[k] = target[k]
            else:
                updated[k] = v  # fallback to English
                changed += 1
        save(path, updated)
        print(f"[{code}] Synced {len(en)} keys, {changed} missing/fallback.")
    print("Done. Run translate_locales.py to translate missing keys via OpenRouter.")


if __name__ == "__main__":
    main()
