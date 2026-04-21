# Translation Guide (i18n)

## Supported Languages
- `en` — English (source of truth)
- `ru` — Русский
- `es` — Español
- `zh` — 简体中文

## File Structure
```
frontend/public/locales/
├── en.json   # master source — edit this first
├── ru.json
├── es.json
└── zh.json
```

## Rule: Every UI Text Must Use `t()`
**Never hardcode English (or any language) strings in components.** All user-facing text must go through the translation system.

### ✅ Correct
```tsx
import { useLanguage } from "../context/LanguageContext"

export function MyComponent() {
  const { t } = useLanguage()
  return <h1>{t("dashboard.title")}</h1>
}
```

### ❌ Wrong
```tsx
export function MyComponent() {
  return <h1>Dashboard</h1>  // hardcoded!
}
```

## How to Add a New Translation Key

1. **Add the key to `en.json` first.**
   ```json
   "myFeature.newLabel": "New Feature Label"
   ```

2. **Use it in your component.**
   ```tsx
   const { t } = useLanguage()
   <span>{t("myFeature.newLabel")}</span>
   ```

3. **Translate to other languages** using the OpenRouter script:
   ```bash
   export OPENROUTER_API_KEY=sk-or-xxx
   python scripts/translate_locales.py
   ```
   The script will detect missing keys in `ru/es/zh.json` and translate them automatically.

4. **Review machine translations** for accuracy, especially for:
   - Financial/technical terms
   - Short labels that may need context
   - Gendered languages (Russian, Spanish)

## Naming Conventions for Keys

Use dot-notation with namespace prefixes:

| Namespace | Example keys |
|-----------|--------------|
| `common.*` | Buttons, generic words (save, cancel, close) |
| `sidebar.*` | Navigation items |
| `dashboard.*` | Dashboard page |
| `yieldCurve.*` | Yield curve page |
| `macro.*` | Macro correlations page |
| `pricing.*` | Pricing page |
| `portfolio.*` | Portfolio page |
| `signals.*` | Signals page |
| `auth.*` | Authentication flows |
| `newsletter.*` | Newsletter popup |
| `userMenu.*` | User dropdown menu |
| `profile.*` | Profile page |
| `admin.*` | Admin panel |

## Dynamic Content / Interpolation

If a string contains a variable, split it into separate keys:

```json
"newsletter.consentPrefix": "By subscribing, I agree to the",
"newsletter.terms": "Terms of Service",
"newsletter.consentSuffix": "and consent to receiving marketing emails."
```

Then compose in JSX:
```tsx
<span>
  {t("newsletter.consentPrefix")}{" "}
  <a href="/terms">{t("newsletter.terms")}</a>{" "}
  {t("newsletter.consentSuffix")}
</span>
```

## Technical Terms Policy

Keep these in English across all languages (users expect them):
- `MVRV`, `NUPL`, `OI`, `EMA`, `VAH`, `VAL`, `POC`, `PnL`
- `BTC`, `ETH`, `VIX`, `SPX`
- `Risk On / Risk Off`

## Running Translations Manually

If you don't have API access, update the target JSON files manually. Always keep the **same key order** as `en.json` for easier diffs.

## Validation Checklist Before Commit

- [ ] All new UI strings use `t()` — no hardcoded text
- [ ] Key added to `en.json`
- [ ] Key translated in `ru.json`, `es.json`, `zh.json`
- [ ] Build passes: `cd frontend && npm run build`
