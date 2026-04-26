"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Ticket } from "lucide-react";
import { API_BASE_URL } from "@/app/lib/api";
import { useAuth } from "@/app/context/AuthContext";

interface PromoCodeInputProps {
  onSuccess?: () => void;
  variant?: "default" | "compact";
}

export default function PromoCodeInput({ onSuccess, variant = "default" }: PromoCodeInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    expires_at?: string;
    error?: string;
    detail?: string;
  } | null>(null);
  const { refreshUser } = useAuth();

  const activate = async () => {
    if (!code.trim() || code.length < 3) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/promo/activate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.detail || "Activation failed" });
      } else {
        setResult({
          success: true,
          message: data.message,
          expires_at: data.expires_at,
        });
        await refreshUser();
        onSuccess?.();
      }
    } catch (e: any) {
      setResult({ error: e.message || "Network error" });
    } finally {
      setLoading(false);
    }
  };

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="PROMO"
          className="h-8 w-32 uppercase text-xs bg-background border-border"
          maxLength={50}
        />
        <Button
          size="sm"
          onClick={activate}
          disabled={loading || code.length < 3}
          className="h-8 text-xs"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "OK"}
        </Button>
        {result?.success && (
          <span className="text-xs text-green-500">Activated!</span>
        )}
        {result?.error && (
          <span className="text-xs text-red-500">{result.error}</span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 max-w-md">
      <div className="flex items-center gap-2 mb-2">
        <Ticket className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Активировать промокод</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Получите полный доступ на 7 дней
      </p>

      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Введите промокод"
          className="flex-1 uppercase"
          maxLength={50}
          onKeyDown={(e) => e.key === "Enter" && activate()}
        />
        <Button
          onClick={activate}
          disabled={loading || code.length < 3}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Активировать"
          )}
        </Button>
      </div>

      {result?.success && (
        <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-green-500 text-sm">{result.message}</p>
          {result.expires_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Доступен до: {new Date(result.expires_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {result?.error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-500 text-sm">{result.error}</p>
        </div>
      )}
    </div>
  );
}
