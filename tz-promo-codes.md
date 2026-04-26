# ТЗ: Система промокодов для партнеров Mirkaso

**Для:** Kimi VSCode  
**Проект:** Mirkaso (crypto-signals)  
**Статус:** Готово к реализации  
**Приоритет:** High  

---

## Общая концепция

Партнеры (affiliates) получают уникальные промокоды. При активации промокода новый пользователь получает **полный доступ ко всем функциям Investor tier на 7 дней**.

Это отдельная система от реферальной программы:
- **Рефералка:** постоянная, для всех пользователей, % от подписок
- **Промокоды:** для партнеров/инфлюенсеров/блогеров, 7-дневный полный trial

---

## 1. Таблицы базы данных

### 1.1 `promo_codes` — таблица промокодов

```sql
CREATE TABLE promo_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,           -- сам промокод (например: "CRYPTO2026")
    description TEXT,                            -- описание для админа
    partner_id INTEGER REFERENCES users(id),     -- кто создал/владеет промокодом
    partner_name VARCHAR(100),                   -- имя партнера (для отображения)
    
    -- Ограничения
    max_uses INTEGER DEFAULT NULL,               -- NULL = unlimited
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Срок действия промокода
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,  -- NULL = бессрочно
    
    -- Что дает промокод
    trial_days INTEGER DEFAULT 7,                -- длительность trial (стандарт: 7)
    trial_tier VARCHAR(20) DEFAULT 'investor',   -- какой tier дает на время trial
    
    -- Скидка при конверсии (опционально)
    discount_percent INTEGER DEFAULT 0,          -- 0 = без скидки
    discount_applies_to VARCHAR(20) DEFAULT NULL, -- 'trader' | 'investor' | NULL
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_partner ON promo_codes(partner_id);
CREATE INDEX idx_promo_codes_active ON promo_codes(is_active, valid_until);
```

### 1.2 `promo_code_activations` — история активаций

```sql
CREATE TABLE promo_code_activations (
    id SERIAL PRIMARY KEY,
    promo_code_id INTEGER NOT NULL REFERENCES promo_codes(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- когда закончится trial
    
    -- Статус
    status VARCHAR(20) DEFAULT 'active',  -- 'active' | 'expired' | 'converted'
    converted_to_tier VARCHAR(20) DEFAULT NULL,  -- на что конвертировался (trader/investor)
    converted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    -- Для аналитики
    ip_address INET,
    user_agent TEXT,
    
    UNIQUE(user_id)  -- один пользователь = одна активация промокода (всего)
);

CREATE INDEX idx_promo_activations_user ON promo_code_activations(user_id);
CREATE INDEX idx_promo_activations_code ON promo_code_activations(promo_code_id);
CREATE INDEX idx_promo_activations_status ON promo_code_activations(status, expires_at);
```

---

## 2. Логика активации промокода

### 2.1 Flow активации

```
Пользователь вводит промокод → Проверка → Активация trial
```

### 2.2 Правила проверки

```python
def validate_promo_code(code: str, user_id: int) -> dict:
    """
    Проверяет промокод и возвращает результат.
    """
    promo = db.query("SELECT * FROM promo_codes WHERE code = %s", code)
    
    if not promo:
        return {"valid": False, "error": "PROMO_NOT_FOUND"}
    
    if not promo.is_active:
        return {"valid": False, "error": "PROMO_INACTIVE"}
    
    if promo.valid_until and promo.valid_until < now():
        return {"valid": False, "error": "PROMO_EXPIRED"}
    
    if promo.max_uses and promo.current_uses >= promo.max_uses:
        return {"valid": False, "error": "PROMO_LIMIT_REACHED"}
    
    # Проверить, не активировал ли уже этот пользователь ЛЮБОЙ промокод
    existing = db.query(
        "SELECT * FROM promo_code_activations WHERE user_id = %s AND status = 'active'",
        user_id
    )
    if existing:
        return {"valid": False, "error": "USER_ALREADY_HAS_ACTIVE_PROMO"}
    
    # Проверить, не был ли у пользователя уже trial
    user = db.query("SELECT * FROM users WHERE id = %s", user_id)
    if user.trial_used and not existing:  # если уже использовал trial, но не через промо
        # Можно разрешить или запретить — обсудить
        pass
    
    return {
        "valid": True,
        "promo": promo,
        "trial_days": promo.trial_days,
        "trial_tier": promo.trial_tier
    }
```

### 2.3 Активация

```python
@router.post("/promo/activate")
async def activate_promo(
    code: str = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Активирует промокод для текущего пользователя.
    """
    validation = validate_promo_code(code, current_user["id"])
    
    if not validation["valid"]:
        raise HTTPException(400, validation["error"])
    
    promo = validation["promo"]
    
    # Создать активацию
    expires_at = now() + timedelta(days=promo.trial_days)
    
    db.execute("""
        INSERT INTO promo_code_activations 
        (promo_code_id, user_id, expires_at, ip_address, user_agent)
        VALUES (%s, %s, %s, %s, %s)
    """, promo.id, current_user["id"], expires_at, request.ip, request.user_agent)
    
    # Обновить счетчик использований
    db.execute("""
        UPDATE promo_codes 
        SET current_uses = current_uses + 1 
        WHERE id = %s
    """, promo.id)
    
    # Обновить пользователя: временный tier
    db.execute("""
        UPDATE users 
        SET 
            subscription_tier = %s,
            trial_activated_at = NOW(),
            trial_expires_at = %s,
            trial_source = 'promo_code'
        WHERE id = %s
    """, promo.trial_tier, expires_at, current_user["id"])
    
    return {
        "success": True,
        "message": f"Промокод активирован. Доступ к {promo.trial_tier} на {promo.trial_days} дней.",
        "tier": promo.trial_tier,
        "expires_at": expires_at.isoformat()
    }
```

---

## 3. Проверка доступа с учетом промокода

### 3.1 Middleware/Decorator для проверки tier

```python
def get_effective_tier(user_id: int) -> str:
    """
    Определяет эффективный tier пользователя.
    Учитывает:
    1. Активный промокод (trial)
    2. Обычную подписку
    3. Fallback к 'starter'
    """
    # Проверить активный промокод
    promo_activation = db.query("""
        SELECT * FROM promo_code_activations 
        WHERE user_id = %s AND status = 'active' AND expires_at > NOW()
        ORDER BY expires_at DESC LIMIT 1
    """, user_id)
    
    if promo_activation:
        # Вернуть tier из промокода (investor для полного доступа)
        return {
            "tier": promo_activation.trial_tier,  # 'investor'
            "source": "promo_trial",
            "expires_at": promo_activation.expires_at,
            "is_trial": True
        }
    
    # Проверить обычную подписку
    user = db.query("SELECT * FROM users WHERE id = %s", user_id)
    if user.subscription_tier in ('trader', 'investor') and user.subscription_active:
        return {
            "tier": user.subscription_tier,
            "source": "subscription",
            "is_trial": False
        }
    
    # Fallback
    return {
        "tier": "starter",
        "source": "free",
        "is_trial": False
    }
```

### 3.2 Использование в endpoint-ах

```python
# Было:
@router.get("/portfolio/ai-insight", dependencies=[Depends(_require_tier('trader'))])

# Стало:
@router.get("/portfolio/ai-insight")
async def get_ai_insight(current_user: dict = Depends(get_current_user)):
    effective = get_effective_tier(current_user["id"])
    
    # Проверка доступа
    if effective["tier"] not in ('trader', 'investor'):
        raise HTTPException(403, "Требуется подписка Trader или выше")
    
    # Если trial — проверить лимит AI Insight (для trader tier)
    if effective["is_trial"] and effective["tier"] == 'trader':
        # В promo trial (investor) — unlimited AI
        pass
    
    # ... основная логика
```

---

## 4. Автоматическое истечение trial

### 4.1 Cron job / Background task

```python
async def expire_promo_trials():
    """
    Запускается каждый час.
    Истекает promo trial и уведомляет пользователя.
    """
    expiring = db.query("""
        SELECT a.*, u.email, u.telegram_id
        FROM promo_code_activations a
        JOIN users u ON a.user_id = u.id
        WHERE a.status = 'active' 
          AND a.expires_at < NOW()
    """)
    
    for activation in expiring:
        # Обновить статус
        db.execute("""
            UPDATE promo_code_activations 
            SET status = 'expired' 
            WHERE id = %s
        """, activation.id)
        
        # Вернуть пользователя к starter (если нет активной подписки)
        db.execute("""
            UPDATE users 
            SET subscription_tier = 'starter'
            WHERE id = %s 
              AND subscription_active = FALSE
              AND trial_expires_at < NOW()
        """, activation.user_id)
        
        # Отправить уведомление
        await send_notification(
            user_id=activation.user_id,
            title="Trial истек",
            message="Ваш пробный период закончился. Оформите подписку для продолжения.",
            action_url="/pricing",
            action_text="Оформить подписку"
        )
```

### 4.2 Grace period (опционально)

```python
# Дать 24 часа grace period перед ограничением доступа
GRACE_PERIOD_HOURS = 24

# В get_effective_tier:
if promo_activation and promo_activation.expires_at < now():
    if now() - promo_activation.expires_at < timedelta(hours=GRACE_PERIOD_HOURS):
        # Еще в grace period
        return {"tier": promo_activation.trial_tier, "source": "promo_trial_grace", ...}
```

---

## 5. Аналитика для партнеров

### 5.1 Dashboard партнера

```python
@router.get("/partner/stats")
async def get_partner_stats(current_user: dict = Depends(get_current_user)):
    """
    Доступно только для пользователей с ролью 'partner'.
    """
    if current_user["role"] != "partner":
        raise HTTPException(403, "Требуется статус партнера")
    
    stats = db.query("""
        SELECT 
            pc.code,
            pc.description,
            pc.max_uses,
            pc.current_uses,
            pc.is_active,
            pc.valid_until,
            pc.created_at,
            COUNT(DISTINCT pa.user_id) as total_activations,
            COUNT(DISTINCT CASE WHEN pa.status = 'active' THEN pa.user_id END) as active_trials,
            COUNT(DISTINCT CASE WHEN pa.status = 'converted' THEN pa.user_id END) as conversions,
            COUNT(DISTINCT CASE WHEN pa.status = 'expired' THEN pa.user_id END) as expired,
            COALESCE(SUM(CASE WHEN pa.converted_to_tier IS NOT NULL THEN p.amount ELSE 0 END), 0) as total_revenue
        FROM promo_codes pc
        LEFT JOIN promo_code_activations pa ON pc.id = pa.promo_code_id
        LEFT JOIN payments p ON pa.user_id = p.user_id AND p.status = 'completed'
        WHERE pc.partner_id = %s
        GROUP BY pc.id
    """, current_user["id"])
    
    return stats
```

### 5.2 Метрики

| Метрика | Описание |
|---------|----------|
| **Activations** | Сколько человек активировали промокод |
| **Active Trials** | Сколько сейчас в trial |
| **Conversions** | Сколько оформили платную подписку после trial |
| **Conversion Rate** | Conversions / Activations × 100 |
| **Revenue** | Сколько денег принесли конвертировавшиеся |
| **ARPU** | Revenue / Activations |
| **Time to Convert** | Среднее время от активации до конверсии |

---

## 6. Создание промокодов (Admin)

### 6.1 API для создания

```python
@router.post("/admin/promo-codes")
async def create_promo_code(
    code: str = Body(..., min_length=3, max_length=50),
    description: str = Body(None),
    partner_id: int = Body(None),
    partner_name: str = Body(None),
    max_uses: int = Body(None),
    valid_until: datetime = Body(None),
    trial_days: int = Body(7),
    trial_tier: str = Body("investor"),
    discount_percent: int = Body(0),
    discount_applies_to: str = Body(None),
    current_user: dict = Depends(require_admin)
):
    """
    Создает новый промокод.
    Только для админов.
    """
    # Проверить уникальность
    existing = db.query("SELECT id FROM promo_codes WHERE code = %s", code)
    if existing:
        raise HTTPException(400, "Промокод уже существует")
    
    db.execute("""
        INSERT INTO promo_codes 
        (code, description, partner_id, partner_name, max_uses, valid_until, 
         trial_days, trial_tier, discount_percent, discount_applies_to)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, code, description, partner_id, partner_name, max_uses, valid_until,
         trial_days, trial_tier, discount_percent, discount_applies_to)
    
    return {"success": True, "code": code}
```

### 6.2 Валидация промокода (frontend)

```python
@router.get("/promo/validate/{code}")
async def check_promo_code(code: str):
    """
    Публичный endpoint для проверки промокода (до регистрации).
    """
    promo = db.query("SELECT * FROM promo_codes WHERE code = %s AND is_active = TRUE", code)
    
    if not promo:
        return {"valid": False}
    
    if promo.valid_until and promo.valid_until < now():
        return {"valid": False}
    
    if promo.max_uses and promo.current_uses >= promo.max_uses:
        return {"valid": False}
    
    return {
        "valid": True,
        "trial_days": promo.trial_days,
        "trial_tier": promo.trial_tier,
        "partner_name": promo.partner_name,
        "discount_percent": promo.discount_percent
    }
```

---

## 7. UI / Frontend

### 7.1 Поле ввода промокода

```tsx
// components/PromoCodeInput.tsx
"use client";

export default function PromoCodeInput() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  const activate = async () => {
    setLoading(true);
    const res = await fetch("/api/v1/promo/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };
  
  return (
    <div className="bg-[#0A0B0D] border border-[#222] rounded-xl p-6 max-w-md">
      <h3 className="text-lg font-semibold mb-2">Активировать промокод</h3>
      <p className="text-sm text-gray-400 mb-4">
        Получите полный доступ на 7 дней
      </p>
      
      <div className="flex gap-2">
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Введите промокод"
          className="flex-1 bg-[#1a1b1e] border border-[#333] rounded-lg px-4 py-2 text-sm uppercase"
        />
        <button
          onClick={activate}
          disabled={loading || code.length < 3}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium"
        >
          {loading ? "..." : "Активировать"}
        </button>
      </div>
      
      {result?.success && (
        <div className="mt-3 p-3 bg-green-900/30 border border-green-700/50 rounded-lg">
          <p className="text-green-400 text-sm">{result.message}</p>
          <p className="text-xs text-gray-400 mt-1">
            Доступен до: {new Date(result.expires_at).toLocaleDateString()}
          </p>
        </div>
      )}
      
      {result?.error && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
          <p className="text-red-400 text-sm">{result.error}</p>
        </div>
      )}
    </div>
  );
}
```

### 7.2 Размещение

- **Страница /pricing** — под формой подписки: "У вас есть промокод?"
- **Dashboard** — баннер вверху: "Активируйте промокод для полного доступа на 7 дней"
- **При регистрации** — поле "Промокод (опционально)" после email/password
- **Settings / Subscription** — раздел "Промокоды"

### 7.3 Индикатор активного trial

```tsx
// components/TrialStatusBanner.tsx
export default function TrialStatusBanner({ expiresAt, tier }) {
  const daysLeft = Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
  
  return (
    <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-blue-400 font-medium">
            Полный доступ к {tier} — осталось {daysLeft} дней
          </p>
          <p className="text-xs text-gray-400">
            Истекает {new Date(expiresAt).toLocaleDateString()}
          </p>
        </div>
        <a 
          href="/pricing" 
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium"
        >
          Оформить подписку
        </a>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 h-1 bg-[#222] rounded-full">
        <div 
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${(daysLeft / 7) * 100}%` }}
        />
      </div>
    </div>
  );
}
```

---

## 8. Интеграция с реферальной программой

### 8.1 Совместимость

| | Промокоды | Рефералка |
|---|---|---|
| **Кто создает** | Админ / Партнеры | Система (автоматически) |
| **Кто раздает** | Партнеры, блогеры | Все пользователи |
| **Что получает новый пользователь** | 7 дней полного доступа | 20% скидка или +3 дня trial |
| **Что получает пригласивший** | Ничего (или % от конверсий) | $4 за Trader / $8 за Investor |
| **Совместимость** | Можно использовать вместе | Нет — одно или другое |

### 8.2 Приоритет

```python
# Пользователь может использовать ЛИБО промокод ЛИБО рефералку
# Но не оба сразу (для простоты)

# При регистрации с реферальной ссылкой:
# - Создается referral connection
# - Начисляется +3 дня trial (или 20% скидка)
# - Промокод уже нельзя активировать

# При активации промокода:
# - Проверить, нет ли referral connection
# - Если есть — отказать или предупредить
```

### 8.3 Партнер = реферер?

```python
# Опционально: сделать партнеров автоматическими реферерами
# Когда пользователь активирует промокод партнера:
# - Создается referral connection (partner = referrer)
# - При конверсии партнер получает комиссию

# Нужно добавить в promo_codes:
# is_referral_linked BOOLEAN DEFAULT FALSE
# Если TRUE — при активации создавать referral запись
```

---

## 9. Пример промокодов для запуска

```sql
-- Промокод для крипто-блогера
INSERT INTO promo_codes (code, description, partner_name, max_uses, trial_days, trial_tier, discount_percent)
VALUES ('CRYPTO2026', 'Партнерский промо для крипто-блогеров', 'Crypto Blogger', 1000, 7, 'investor', 20);

-- Промокод для YouTube канала
INSERT INTO promo_codes (code, description, partner_name, max_uses, trial_days, trial_tier, discount_percent)
VALUES ('YOUTUBE7', 'YouTube канал Mirkaso Review', 'YouTube Partner', 500, 7, 'investor', 15);

-- Промокод для Telegram канала
INSERT INTO promo_codes (code, description, partner_name, max_uses, trial_days, trial_tier, discount_percent)
VALUES ('TGPRO7', 'Telegram канал Crypto Signals', 'TG Partner', 500, 7, 'investor', 15);

-- Эксклюзивный промокод (ограниченный)
INSERT INTO promo_codes (code, description, partner_name, max_uses, valid_until, trial_days, trial_tier, discount_percent)
VALUES ('VIP2026', 'Эксклюзив для VIP-партнеров', 'VIP Partner', 50, '2026-12-31', 14, 'investor', 25);
```

---

## 10. Файлы для изменения

| Файл | Действие |
|------|----------|
| `backend/database.py` или migrations | Добавить таблицы `promo_codes`, `promo_code_activations` |
| `backend/routers/promo.py` | Создать (новый) — endpoints для активации, валидации, статистики |
| `backend/routers/admin.py` | Добавить endpoint создания промокодов |
| `backend/middleware/tier_check.py` | Обновить `get_effective_tier()` для учета промокодов |
| `backend/cron/expire_trials.py` | Добавить истечение promo trial |
| `frontend/app/components/PromoCodeInput.tsx` | Создать (новый) |
| `frontend/app/components/TrialStatusBanner.tsx` | Создать (новый) |
| `frontend/app/pricing/page.tsx` | Добавить секцию "Промокод" |
| `frontend/app/app/page.tsx` | Добавить TrialStatusBanner в дашборд |
| `frontend/app/settings/subscription/page.tsx` | Добавить раздел промокодов |

---

## Итог

**Партнер получает:**
- Уникальный промокод (например: "CRYPTO2026")
- Dashboard с аналитикой (активации, конверсии, revenue)

**Новый пользователь получает:**
- Полный доступ к Investor tier на 7 дней
- Возможность оформить подписку со скидкой (если настроено)

**Mirkaso получает:**
- Поток новых пользователей от партнеров
- Аналитика по эффективности каналов
- Конверсия trial → paid

---

Готово. После утверждения — напишу ТЗ для Kimi на реализацию.
