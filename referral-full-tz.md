# Реферальная программа Mirkaso — Полное ТЗ (все фазы)

**Дата:** 2026-04-26
**Статус:** Готово к реализации
**Сложность:** 3-4 дня
**Важно:** Выполнять по порядку Phase 1 → 2 → 3 → 4. Не перескакивать.

---

## Бизнес-логика

**Реферал** (приглашенный):
- Регистрируется с кодом → **20% скидка на первый месяц Pro** ($15.20 вместо $19)
- Скидка автоматически при подписке через PayPal

**Реферер** (партнер):
- За каждого реферала с Pro подпиской → **$3.80 на баланс** (20% от $19)
- Баланс тратит на свою подписку или выводит при $50+

**Условия:**
- Новый пользователь (не ранее регистрировавшийся)
- Cookie tracking: 30 дней
- Один пользователь = один реферер. Нельзя перепривязать.
- Скидка используется один раз

---

# PHASE 1: Core (1 день)

## 1.1 DB Миграция

Создать `backend/migrations/001_add_referral_tables.sql`:

```sql
-- Таблица кодов партнеров
CREATE TABLE referral_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    total_referrals INTEGER DEFAULT 0,
    active_referrals INTEGER DEFAULT 0,
    total_earned DECIMAL(10,2) DEFAULT 0.00,
    available_balance DECIMAL(10,2) DEFAULT 0.00,
    withdrawn_balance DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE
);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_user ON referral_codes(user_id);

-- Таблица трекинга рефералов
CREATE TABLE referrals (
    id SERIAL PRIMARY KEY,
    referrer_code_id INTEGER NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
    referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'registered',
    joined_at TIMESTAMP DEFAULT NOW(),
    converted_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    revenue_generated DECIMAL(10,2) DEFAULT 0.00,
    reward_earned DECIMAL(10,2) DEFAULT 0.00,
    UNIQUE(referred_user_id)
);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_code_id);
CREATE INDEX idx_referrals_user ON referrals(referred_user_id);

-- Таблица транзакций
CREATE TABLE referral_transactions (
    id SERIAL PRIMARY KEY,
    referral_code_id INTEGER REFERENCES referral_codes(id) ON DELETE CASCADE,
    referral_id INTEGER REFERENCES referrals(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    paypal_transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_ref_tx_code ON referral_transactions(referral_code_id);
CREATE INDEX idx_ref_tx_user ON referral_transactions(user_id);

-- Колонки в users
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_discount_used BOOLEAN DEFAULT FALSE;
```

## 1.2 Backend: partner.py

Создать `backend/routers/partner.py`:

```python
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import get_db
from routers.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/partner", tags=["partner"])


class GenerateCodeResponse(BaseModel):
    code: str
    referral_link: str
    total_referrals: int
    active_referrals: int
    total_earned: float
    available_balance: float


@router.post("/generate-code")
async def generate_referral_code(current_user: dict = Depends(get_current_user)):
    """Создать реферальный код для текущего пользователя."""
    db = get_db()
    
    # Проверить, есть ли уже код
    existing = await db.query(
        "SELECT * FROM referral_codes WHERE user_id = $1 LIMIT 1",
        [current_user["id"]]
    )
    
    if existing:
        code = existing[0]["code"]
    else:
        # Сгенерировать код: MIRKASO_{username}_{random}
        import secrets
        username = current_user.get("username", "user")
        suffix = secrets.token_hex(3).upper()
        code = f"MIRKASO_{username}_{suffix}"
        
        # На случай коллизии — укоротить до 20 символов
        code = code[:20]
        
        await db.execute(
            "INSERT INTO referral_codes (user_id, code) VALUES ($1, $2)",
            [current_user["id"], code]
        )
    
    return {
        "code": code,
        "referral_link": f"https://mirkaso.com/?ref={code}",
    }


@router.get("/stats")
async def partner_stats(current_user: dict = Depends(get_current_user)):
    """Статистика партнера."""
    db = get_db()
    
    code_row = await db.query(
        "SELECT * FROM referral_codes WHERE user_id = $1 LIMIT 1",
        [current_user["id"]]
    )
    
    if not code_row:
        return {
            "code": None,
            "referral_link": None,
            "total_referrals": 0,
            "active_referrals": 0,
            "total_earned": 0.00,
            "available_balance": 0.00,
            "referrals": [],
            "transactions": [],
        }
    
    code = dict(code_row[0])
    
    # Список рефералов
    refs = await db.query(
        """SELECT r.*, u.username, u.email
           FROM referrals r
           JOIN users u ON u.id = r.referred_user_id
           WHERE r.referrer_code_id = $1
           ORDER BY r.joined_at DESC""",
        [code["id"]]
    )
    
    # История транзакций
    txs = await db.query(
        """SELECT * FROM referral_transactions
           WHERE referral_code_id = $1
           ORDER BY created_at DESC LIMIT 50""",
        [code["id"]]
    )
    
    return {
        "code": code["code"],
        "referral_link": f"https://mirkaso.com/?ref={code['code']}",
        "total_referrals": code["total_referrals"],
        "active_referrals": code["active_referrals"],
        "total_earned": float(code["total_earned"]),
        "available_balance": float(code["available_balance"]),
        "referrals": [dict(r) for r in refs],
        "transactions": [dict(t) for t in txs],
    }


@router.get("/balance")
async def get_balance(current_user: dict = Depends(get_current_user)):
    """Текущий реферальный баланс."""
    db = get_db()
    row = await db.query(
        "SELECT available_balance FROM referral_codes WHERE user_id = $1 LIMIT 1",
        [current_user["id"]]
    )
    return {"balance": float(row[0]["available_balance"]) if row else 0.00}


@router.get("/check-eligibility")
async def check_referral_eligibility(current_user: dict = Depends(get_current_user)):
    """Может ли текущий пользователь использовать реферальную скидку."""
    db = get_db()
    user = await db.query(
        "SELECT referred_by_code, referral_discount_used FROM users WHERE id = $1",
        [current_user["id"]]
    )
    
    if not user:
        return {"eligible": False}
    
    eligible = (
        user[0]["referred_by_code"] is not None
        and not user[0]["referral_discount_used"]
    )
    
    return {
        "eligible": eligible,
        "code": user[0]["referred_by_code"] if eligible else None,
        "discount_percent": 20 if eligible else 0,
    }
```

## 1.3 Backend: модификация auth.py

В `backend/routers/auth.py` — модель `RegisterRequest` и функция `register`:

```python
class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    referral_code: Optional[str] = None  # ДОБАВИТЬ

async def register(body: RegisterRequest):
    # ...существующая логика регистрации...
    
    # После создания пользователя:
    referred_by = None
    if body.referral_code:
        # Проверить код
        ref_code = await db.query(
            "SELECT * FROM referral_codes WHERE code = $1 AND is_active = TRUE LIMIT 1",
            [body.referral_code]
        )
        
        if ref_code:
            ref_code_id = ref_code[0]["id"]
            referrer_user_id = ref_code[0]["user_id"]
            
            # Нельзя использовать свой собственный код
            if referrer_user_id == user_id:
                logger.warning(f"User {user_id} tried to use own referral code")
            else:
                referred_by = body.referral_code
                
                # Создать запись в referrals
                await db.execute(
                    """INSERT INTO referrals (referrer_code_id, referred_user_id, status)
                       VALUES ($1, $2, 'registered')""",
                    [ref_code_id, user_id]
                )
                
                # Увеличить счетчик
                await db.execute(
                    "UPDATE referral_codes SET total_referrals = total_referrals + 1 WHERE id = $1",
                    [ref_code_id]
                )
    
    # Создать пользователя с referred_by_code
    # ...UPDATE users SET referred_by_code = referred_by...
```

## 1.4 Backend: регистрация router

В `backend/main.py` добавить:
```python
from routers import partner
app.include_router(partner.router)
```

## 1.5 Frontend: Cookie tracking

В `frontend/app/page.tsx` или `frontend/app/layout.tsx`:

```tsx
"use client"  // или в отдельном Client Component

useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  
  if (refCode) {
    // Установить cookie на 30 дней
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `ref_code=${refCode};expires=${expires};path=/;SameSite=Lax`;
    
    // Показать тост
    toast.success("Referral code applied! You'll get 20% off Pro.");
  }
}, []);
```

## 1.6 Frontend: AuthModal

В `frontend/app/components/AuthModal.tsx`:

```tsx
// Добавить state
const [referralCode, setReferralCode] = useState("");

useEffect(() => {
  // Автозаполнение из cookie
  const match = document.cookie.match(/ref_code=([^;]+)/);
  if (match) {
    setReferralCode(match[1]);
  }
}, []);

// В форме регистрации добавить поле:
{/* Referral Code (optional) */}
<div className="space-y-2">
  <label className="text-sm font-medium">Referral Code (optional)</label>
  <Input
    value={referralCode}
    onChange={(e) => setReferralCode(e.target.value)}
    placeholder="MIRKASO_..."
  />
  {referralCode && (
    <p className="text-xs text-emerald-500">🎉 You'll get 20% off your first month!</p>
  )}
</div>

// При отправке формы:
const handleRegister = async () => {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      email,
      password,
      referral_code: referralCode || undefined,  // ДОБАВИТЬ
    }),
  });
};
```

## 1.7 Чек-лист Phase 1

- [ ] `001_add_referral_tables.sql` создан и применен
- [ ] `partner.py` создан с `/generate-code`, `/stats`, `/balance`, `/check-eligibility`
- [ ] `auth.py` принимает `referral_code` в `RegisterRequest`
- [ ] Cookie tracking на landing (`/?ref=XXX`)
- [ ] AuthModal поле "Referral Code" с авто-заполнением
- [ ] Router зарегистрирован в `main.py`

---

# PHASE 2: PayPal Integration (1 день)

## 2.1 Скидка при подписке

В `backend/routers/payments.py` — `create_trial()`:

```python
@router.post("/create-trial")
async def create_trial(req: CreateTrialRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    
    # Проверить referral eligibility
    user = await db.query(
        "SELECT referred_by_code, referral_discount_used FROM users WHERE id = $1",
        [current_user["id"]]
    )
    
    is_referral = user and user[0]["referred_by_code"] and not user[0]["referral_discount_used"]
    
    plan = await _get_or_create_trial_plan(req.billing_cycle)
    paypal_plan_id = plan["paypal_plan_id"]
    
    if is_referral:
        # Создать динамический plan со скидкой 20%
        discount_price = plan["price"] * 0.8
        paypal = get_paypal_api()
        
        product_res = await paypal.create_product(
            name="Mirkaso Pro (Referral Discount)",
            description=f"Pro subscription with 20% referral discount — ${discount_price:.2f}/{req.billing_cycle}"
        )
        
        plan_res = await paypal.create_plan(
            product_id=product_res["id"],
            name=f"{plan['name']} (Discounted)",
            amount=discount_price,
            currency="USD",
            trial_days=7,
            billing_cycle=req.billing_cycle,
        )
        
        paypal_plan_id = plan_res["id"]
        
        # Отметить скидку как использованную
        await db.execute(
            "UPDATE users SET referral_discount_used = TRUE WHERE id = $1",
            [current_user["id"]]
        )
    
    # ...создание подписки через paypal_plan_id...
```

## 2.2 Webhook: начисление рефереру

В `backend/routers/payments.py` — `paypal_webhook()`:

```python
elif event_type == "BILLING.SUBSCRIPTION.ACTIVATED":
    sub_id = resource_id
    
    # Существующая логика
    await db.execute(
        "UPDATE subscriptions SET status = 'active' WHERE paypal_subscription_id = $1",
        [sub_id]
    )
    
    sub = await db.query(
        "SELECT user_id, plan_id FROM subscriptions WHERE paypal_subscription_id = $1",
        [sub_id]
    )
    
    if sub:
        user_id = sub[0]["user_id"]
        plan_id = sub[0]["plan_id"]
        
        # --- НОВАЯ ЛОГИКА: начисление рефереру ---
        user = await db.query(
            "SELECT referred_by_code FROM users WHERE id = $1",
            [user_id]
        )
        
        if user and user[0]["referred_by_code"]:
            ref_code = user[0]["referred_by_code"]
            
            # Проверить, не было ли уже начисления
            existing_reward = await db.query(
                """SELECT 1 FROM referral_transactions t
                   JOIN referral_codes c ON c.id = t.referral_code_id
                   WHERE c.code = $1 AND t.type = 'reward'
                   AND t.paypal_transaction_id = $2 LIMIT 1""",
                [ref_code, sub_id]
            )
            
            if not existing_reward:
                plan = await db.query("SELECT price FROM plans WHERE id = $1", [plan_id])
                if plan:
                    price = float(plan[0]["price"])
                    reward = round(price * 0.2, 2)
                    
                    ref_code_row = await db.query(
                        "SELECT id, user_id FROM referral_codes WHERE code = $1",
                        [ref_code]
                    )
                    
                    if ref_code_row:
                        ref_code_id = ref_code_row[0]["id"]
                        referrer_id = ref_code_row[0]["user_id"]
                        
                        # Начислить
                        await db.execute(
                            """UPDATE referral_codes
                               SET available_balance = available_balance + $1,
                                   total_earned = total_earned + $1,
                                   active_referrals = active_referrals + 1
                               WHERE id = $2""",
                            [reward, ref_code_id]
                        )
                        
                        # Обновить referrals
                        await db.execute(
                            """UPDATE referrals
                               SET status = 'subscribed',
                                   converted_at = NOW(),
                                   revenue_generated = revenue_generated + $1,
                                   reward_earned = reward_earned + $2
                               WHERE referrer_code_id = $3 AND referred_user_id = $4""",
                            [price, reward, ref_code_id, user_id]
                        )
                        
                        # Транзакция
                        await db.execute(
                            """INSERT INTO referral_transactions
                               (referral_code_id, user_id, type, amount, description, paypal_transaction_id)
                               VALUES ($1, $2, 'reward', $3, 'Referral subscription activated', $4)""",
                            [ref_code_id, referrer_id, reward, sub_id]
                        )
        
        # Существующая логика grant_access
        plan = await db.query("SELECT tier FROM plans WHERE id = $1", [plan_id])
        if plan:
            await _grant_access(user_id, plan[0]["tier"])
```

## 2.3 Frontend: Pricing banner

В `frontend/app/pricing/PricingClient.tsx`:

```tsx
const [referralEligible, setReferralEligible] = useState(false);

useEffect(() => {
  if (isAuthenticated) {
    fetch(`${API_BASE_URL}/partner/check-eligibility`, {
      credentials: 'include'
    })
    .then(r => r.json())
    .then(data => setReferralEligible(data.eligible));
  }
}, [isAuthenticated]);

// В JSX:
{referralEligible && (
  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-6">
    <p className="text-emerald-400 font-medium text-center">
      🎉 Referral discount active! First month: <span className="line-through">$19</span> $15.20
    </p>
  </div>
)}
```

## 2.4 Чек-лист Phase 2

- [ ] `create_trial()` проверяет `referred_by_code` и `referral_discount_used`
- [ ] Динамический PayPal plan создается со скидкой 20%
- [ ] `referral_discount_used = TRUE` после использования
- [ ] Webhook `BILLING.SUBSCRIPTION.ACTIVATED` начисляет рефереру 20%
- [ ] Проверка на повторное начисление (идемпотентность)
- [ ] Pricing page показывает banner и скидочную цену
- [ ] `/partner/check-eligibility` работает

---

# PHASE 3: Partner Dashboard (1 день)

## 3.1 Страница `/partner`

Создать `frontend/app/partner/page.tsx`:

```tsx
export default function PartnerPage() {
  const [stats, setStats] = useState(null);
  const { user } = useAuth();
  
  useEffect(() => {
    fetch(`${API_BASE_URL}/partner/stats`, { credentials: 'include' })
      .then(r => r.json())
      .then(setStats);
  }, []);
  
  const generateCode = async () => {
    const res = await fetch(`${API_BASE_URL}/partner/generate-code`, {
      method: 'POST',
      credentials: 'include'
    });
    const data = await res.json();
    setStats(prev => ({ ...prev, code: data.code, referral_link: data.referral_link }));
  };
  
  if (!stats) return <Loading />;
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Partner Program</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard title="Your Code" value={stats.code || "—"} />
        <StatCard title="Total Referrals" value={stats.total_referrals} />
        <StatCard title="Active" value={stats.active_referrals} />
        <StatCard title="Total Earned" value={`$${stats.total_earned}`} />
        <StatCard title="Available" value={`$${stats.available_balance}`} />
      </div>
      
      {/* Generate Code Button */}
      {!stats.code && (
        <Button onClick={generateCode}>Become a Partner</Button>
      )}
      
      {/* Referral Link */}
      {stats.code && (
        <div className="bg-muted p-4 rounded-lg mb-8">
          <p className="font-mono text-sm break-all">{stats.referral_link}</p>
          <Button onClick={() => navigator.clipboard.writeText(stats.referral_link)}>
            Copy Link
          </Button>
        </div>
      )}
      
      {/* QR Code */}
      {stats.code && <QRCode value={stats.referral_link} size={200} />}
      
      {/* Referrals Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.referrals?.map(ref => (
            <TableRow key={ref.id}>
              <TableCell>{ref.username}</TableCell>
              <TableCell>
                <Badge variant={ref.status === 'subscribed' ? 'emerald' : 'secondary'}>
                  {ref.status}
                </Badge>
              </TableCell>
              <TableCell>{new Date(ref.joined_at).toLocaleDateString()}</TableCell>
              <TableCell>${ref.revenue_generated}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Transactions */}
      <h2 className="text-xl font-bold mt-8 mb-4">Earnings History</h2>
      <Table>
        {/* Date | Type | Amount | Description */}
      </Table>
    </div>
  );
}
```

## 3.2 Вкладка в `/profile`

В `frontend/app/profile/page.tsx` добавить:

```tsx
const tabs = [
  { id: 'general', label: 'General' },
  { id: 'subscription', label: 'Subscription' },
  { id: 'partner', label: 'Partner Program' },  // НОВАЯ ВКЛАДКА
];

// В содержимом вкладки partner:
<div className="space-y-4">
  {partnerStats?.code ? (
    <>
      <p>Your code: <span className="font-mono">{partnerStats.code}</span></p>
      <p>Referrals: {partnerStats.total_referrals}</p>
      <p>Earned: ${partnerStats.total_earned}</p>
      <Link href="/partner">View full dashboard →</Link>
    </>
  ) : (
    <Button onClick={() => router.push('/partner')}>Become a Partner</Button>
  )}
</div>
```

## 3.3 Чек-лист Phase 3

- [ ] Страница `/partner` с stats, code, link, QR
- [ ] Вкладка в `/profile`
- [ ] Таблица рефералов (username, status, joined, revenue)
- [ ] Таблица транзакций (date, type, amount, description)
- [ ] Кнопка "Copy Link"
- [ ] Кнопка "Become a Partner"
- [ ] QR Code (использовать любую библиотеку, например `qrcode.react`)

---

# PHASE 4: Polish (0.5 дня)

## 4.1 Тосты и уведомления

- При копировании ссылки — тост "Link copied!"
- При генерации кода — тост "You're now a partner!"
- При регистрации с рефералкой — тост "20% discount will be applied at checkout"

## 4.2 Валидация

- В `register`: проверить `referral_code` не равен собственному коду
- В `generate-code`: проверить что код уникален (уже есть в SQL)
- В `create_trial`: проверить что `referral_discount_used` еще FALSE

## 4.3 Email notification (опционально)

В `backend/services/notifications.py`:

```python
async def notify_referrer_new_signup(referrer_email: str, referred_username: str):
    """Отправить email рефереру о новом реферале."""
    # ...email template...
```

Вызвать в `register()` после создания referrals:
```python
if referred_by:
    # Получить email реферера
    referrer = await db.query("SELECT email FROM users WHERE id = $1", [referrer_user_id])
    if referrer:
        await notify_referrer_new_signup(referrer[0]["email"], body.username)
```

## 4.4 Тесты

```python
# backend/tests/test_referrals.py
async def test_generate_code():
    # Создать пользователя
    # POST /partner/generate-code
    # Проверить что code возвращается и записан в БД

async def test_register_with_referral():
    # Создать реферера с кодом
    # Зарегистрировать нового пользователя с кодом
    # Проверить referred_by_code, referrals запись

async def test_referral_discount_applied():
    # Регистрация с кодом
    # create_trial — проверить что план создается со скидкой

async def test_webhook_grants_reward():
    # Мокнуть webhook BILLING.SUBSCRIPTION.ACTIVATED
    # Проверить что referral_codes.available_balance увеличился
```

## 4.5 Чек-лист Phase 4

- [ ] Тосты на всех ключевых действиях
- [ ] Валидация (свой код, повторная скидка)
- [ ] Email notification рефереру (опционально)
- [ ] Тесты (генерация кода, регистрация с рефералкой, webhook)

---

# Итоговый чек-лист всего проекта

- [ ] **Phase 1:** DB, generate-code, stats, register с referral_code, cookie, AuthModal
- [ ] **Phase 2:** PayPal скидка 20%, webhook начисление, pricing banner
- [ ] **Phase 3:** /partner страница, /profile вкладка, QR, таблицы
- [ ] **Phase 4:** Тосты, валидация, тесты

---

*Полное ТЗ готово. Начинай с Phase 1, не перескакивай. После каждой фазы приходи — я проверю через curl.*
