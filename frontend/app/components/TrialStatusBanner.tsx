"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";

interface TrialStatusBannerProps {
  expiresAt: string;
  tier?: string;
}

export default function TrialStatusBanner({ expiresAt, tier = "pro" }: TrialStatusBannerProps) {
  const now = new Date().getTime();
  const end = new Date(expiresAt).getTime();
  const totalMs = 7 * 24 * 60 * 60 * 1000; // assume 7-day total for progress
  const remainingMs = Math.max(0, end - now);
  const daysLeft = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  const progressPct = Math.min(100, Math.max(0, (remainingMs / totalMs) * 100));

  if (remainingMs <= 0) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary">
              Полный доступ к {tier} — осталось {daysLeft} {daysLeft === 1 ? "день" : daysLeft < 5 ? "дня" : "дней"}
            </p>
            <p className="text-xs text-muted-foreground">
              Истекает {new Date(expiresAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => (window.location.href = "/pricing")}
        >
          Оформить подписку
        </Button>
      </div>

      <div className="mt-3">
        <Progress value={progressPct} className="h-1.5" />
      </div>
    </div>
  );
}
