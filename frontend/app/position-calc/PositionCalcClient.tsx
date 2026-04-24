"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSidebar } from "@/hooks/useSidebar"
import Sidebar from "../components/admin/Sidebar"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/app/context/LanguageContext"
import { useAuth } from "@/app/context/AuthContext"
import { API_BASE_URL } from "@/app/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Calculator,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Crown,
  TrendingUp,
  ShieldAlert,
} from "lucide-react"

interface CalcResult {
  quantity: number
  position_value: number
  margin: number
  allocation_pct: number
  leverage: number
  exchange_leverage: number
  liquidation_price: number
  risk_amount: number
  stop_distance: number
  max_leverage_exceeded: boolean
}

interface FormState {
  direction: "long" | "short"
  portfolio_balance: string
  risk_type: "percent" | "fixed"
  risk_value: string
  entry_price: string
  stop_price: string
}

const INITIAL_FORM: FormState = {
  direction: "long",
  portfolio_balance: "10000",
  risk_type: "percent",
  risk_value: "1",
  entry_price: "",
  stop_price: "",
}

export default function PositionCalcClient() {
  const { collapsed, toggle } = useSidebar()
  const { t } = useLanguage()
  const { user, isAuthenticated } = useAuth()
  const isPro = user?.subscription_tier === "pro" || user?.subscription_tier === "admin"

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [result, setResult] = useState<CalcResult | null>(null)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  // Pro access check
  useEffect(() => {
    if (!isAuthenticated) {
      setCheckingAccess(false)
      return
    }
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/position-calc/check-access`, {
          credentials: "include",
        })
        if (res.ok) {
          const data = await res.json()
          setHasAccess(data.has_access)
        }
      } catch {
        // fallback to client-side check
        setHasAccess(isPro)
      } finally {
        setCheckingAccess(false)
      }
    }
    check()
  }, [isAuthenticated, isPro])

  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {}
    const bal = parseFloat(form.portfolio_balance)
    const entry = parseFloat(form.entry_price)
    const stop = parseFloat(form.stop_price)
    const risk = parseFloat(form.risk_value)

    if (isNaN(bal) || bal <= 0) errs.portfolio_balance = t("positionCalc.errorDeposit")
    if (isNaN(entry) || entry <= 0) errs.entry_price = t("positionCalc.errorEntry")
    if (isNaN(stop) || stop <= 0) errs.stop_price = t("positionCalc.errorStop")
    if (!isNaN(entry) && !isNaN(stop) && entry === stop) errs.stop_price = t("positionCalc.errorStopEqual")
    if (!isNaN(entry) && !isNaN(stop) && form.direction === "long" && stop >= entry)
      errs.stop_price = t("positionCalc.errorStopLong")
    if (!isNaN(entry) && !isNaN(stop) && form.direction === "short" && stop <= entry)
      errs.stop_price = t("positionCalc.errorStopShort")
    if (isNaN(risk) || risk <= 0) errs.risk_value = t("positionCalc.errorRisk")
    if (form.risk_type === "percent" && !isNaN(risk) && risk > 100) errs.risk_value = t("positionCalc.errorRiskPercent")
    if (form.risk_type === "fixed" && !isNaN(risk) && !isNaN(bal) && risk > bal)
      errs.risk_value = t("positionCalc.errorRiskFixed")

    return errs
  }, [form, t])

  const calculate = useCallback((): CalcResult | null => {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return null

    const bal = parseFloat(form.portfolio_balance)
    const entry = parseFloat(form.entry_price)
    const stop = parseFloat(form.stop_price)
    const riskVal = parseFloat(form.risk_value)

    const risk_amount = form.risk_type === "percent" ? bal * (riskVal / 100) : riskVal
    const stop_distance = form.direction === "long" ? entry - stop : stop - entry
    const quantity = risk_amount / stop_distance
    const position_value = quantity * entry
    const leverage = position_value / bal

    return {
      quantity,
      position_value,
      margin: risk_amount,
      allocation_pct: (position_value / bal) * 100,
      leverage,
      exchange_leverage: Math.min(Math.max(1, Math.ceil(leverage)), 125),
      risk_amount,
      liquidation_price: entry,
      max_leverage_exceeded: leverage > 125,
      stop_distance,
    }
  }, [form, validate])

  useEffect(() => {
    if (hasAccess) {
      setResult(calculate())
    }
  }, [form, hasAccess, calculate])

  const handleReset = () => setForm(INITIAL_FORM)

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Upsell screen for non-Pro
  if (!checkingAccess && !hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar collapsed={collapsed} onToggle={toggle} />
        <main className={cn("transition-all duration-300", collapsed ? "lg:ml-16" : "lg:ml-64")}>
          <div className="p-4 lg:p-8 max-w-2xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Calculator className="h-6 w-6 text-indigo-500" />
                {t("positionCalc.title")}
              </h1>
            </div>
            <Card className="border-amber-500/20">
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <Crown className="h-12 w-12 text-amber-500 mx-auto" />
                <h2 className="text-xl font-bold">{t("positionCalc.proOnlyTitle")}</h2>
                <p className="text-muted-foreground max-w-md mx-auto">{t("positionCalc.proOnlyDesc")}</p>
                <Button asChild className="gap-2">
                  <a href="/pricing">{t("positionCalc.upgradeCta")}</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main className={cn("transition-all duration-300", collapsed ? "lg:ml-16" : "lg:ml-64")}>
        <div className="p-4 lg:p-8 max-w-3xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Calculator className="h-6 w-6 text-indigo-500" />
                {t("positionCalc.title")}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">{t("positionCalc.subtitle")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              {t("positionCalc.reset")}
            </Button>
          </div>

          <div className="space-y-6">
            {/* Direction Toggle */}
            <Card>
              <CardContent className="pt-6">
                <Label className="text-sm font-medium mb-3 block">{t("positionCalc.direction")}</Label>
                <div className="flex rounded-lg border p-1 bg-muted/30">
                  <button
                    onClick={() => updateField("direction", "long")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all",
                      form.direction === "long"
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <ArrowUp className="h-4 w-4" />
                    {t("positionCalc.long")}
                  </button>
                  <button
                    onClick={() => updateField("direction", "short")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all",
                      form.direction === "short"
                        ? "bg-red-500 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <ArrowDown className="h-4 w-4" />
                    {t("positionCalc.short")}
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Input Grid */}
            <Card>
              <CardContent className="pt-6 space-y-5">
                {/* Portfolio Balance */}
                <div>
                  <Label htmlFor="balance" className="text-sm font-medium">
                    {t("positionCalc.portfolioBalance")} (USD)
                  </Label>
                  <Input
                    id="balance"
                    type="number"
                    min="0"
                    step="any"
                    value={form.portfolio_balance}
                    onChange={(e) => updateField("portfolio_balance", e.target.value)}
                    className={cn("mt-1.5", errors.portfolio_balance && "border-red-500 focus-visible:ring-red-500")}
                    placeholder="10000"
                  />
                  {errors.portfolio_balance && (
                    <p className="text-xs text-red-500 mt-1">{errors.portfolio_balance}</p>
                  )}
                </div>

                {/* Risk */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-sm font-medium">{t("positionCalc.risk")}</Label>
                    <div className="flex rounded-md border overflow-hidden">
                      <button
                        onClick={() => updateField("risk_type", "percent")}
                        className={cn(
                          "px-2.5 py-1 text-xs font-medium transition-colors",
                          form.risk_type === "percent" ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}
                      >
                        %
                      </button>
                      <button
                        onClick={() => updateField("risk_type", "fixed")}
                        className={cn(
                          "px-2.5 py-1 text-xs font-medium transition-colors",
                          form.risk_type === "fixed" ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}
                      >
                        $
                      </button>
                    </div>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={form.risk_value}
                    onChange={(e) => updateField("risk_value", e.target.value)}
                    className={cn(errors.risk_value && "border-red-500 focus-visible:ring-red-500")}
                    placeholder={form.risk_type === "percent" ? "1" : "100"}
                  />
                  {errors.risk_value && <p className="text-xs text-red-500 mt-1">{errors.risk_value}</p>}
                </div>

                {/* Entry & Stop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="entry" className="text-sm font-medium">
                      {t("positionCalc.entryPrice")}
                    </Label>
                    <Input
                      id="entry"
                      type="number"
                      min="0"
                      step="any"
                      value={form.entry_price}
                      onChange={(e) => updateField("entry_price", e.target.value)}
                      className={cn("mt-1.5", errors.entry_price && "border-red-500 focus-visible:ring-red-500")}
                      placeholder="77500"
                    />
                    {errors.entry_price && <p className="text-xs text-red-500 mt-1">{errors.entry_price}</p>}
                  </div>
                  <div>
                    <Label htmlFor="stop" className="text-sm font-medium">
                      {t("positionCalc.stopPrice")}
                    </Label>
                    <Input
                      id="stop"
                      type="number"
                      min="0"
                      step="any"
                      value={form.stop_price}
                      onChange={(e) => updateField("stop_price", e.target.value)}
                      className={cn("mt-1.5", errors.stop_price && "border-red-500 focus-visible:ring-red-500")}
                      placeholder="75700"
                    />
                    {errors.stop_price && <p className="text-xs text-red-500 mt-1">{errors.stop_price}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {result && Object.keys(errors).length === 0 && (
              <Card className="border-emerald-500/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <CardTitle className="text-base">{t("positionCalc.results")}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <ResultItem
                      label={t("positionCalc.quantity")}
                      value={result.quantity.toFixed(6)}
                      highlight
                    />
                    <ResultItem
                      label={t("positionCalc.positionValue")}
                      value={`$${result.position_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    />
                    <ResultItem
                      label={t("positionCalc.allocation")}
                      value={`${result.allocation_pct.toFixed(2)}%`}
                    />
                    <ResultItem
                      label={t("positionCalc.leverage")}
                      value={`${result.leverage.toFixed(1)}x`}
                      warn={result.leverage > 10}
                    />
                    <ResultItem
                      label={t("positionCalc.exchangeLeverage")}
                      value={`${result.exchange_leverage}x`}
                      highlight
                    />
                    <ResultItem
                      label={t("positionCalc.riskAmount")}
                      value={`$${result.risk_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    />
                    <ResultItem
                      label={t("positionCalc.stopDistance")}
                      value={`$${result.stop_distance.toFixed(2)}`}
                    />
                  </div>

                  {/* Warnings */}
                  <div className="mt-4 space-y-2">
                    {result.max_leverage_exceeded && (
                      <div className="flex items-center gap-2 text-red-500 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        {t("positionCalc.warnMaxLeverage")}
                      </div>
                    )}
                    {result.allocation_pct > 100 && (
                      <div className="flex items-center gap-2 text-red-500 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        {t("positionCalc.warnAllocation")}
                      </div>
                    )}
                    {!result.max_leverage_exceeded && result.allocation_pct <= 100 && (
                      <div className="flex items-center gap-2 text-emerald-500 text-sm">
                        <TrendingUp className="h-4 w-4" />
                        {t("positionCalc.okMessage")}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground text-center">
              {t("positionCalc.disclaimer")}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

function ResultItem({
  label,
  value,
  highlight,
  warn,
}: {
  label: string
  value: string
  highlight?: boolean
  warn?: boolean
}) {
  return (
    <div className="bg-muted/40 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p
        className={cn(
          "text-lg font-bold mt-0.5",
          highlight && "text-emerald-600",
          warn && "text-amber-500"
        )}
      >
        {value}
      </p>
    </div>
  )
}
