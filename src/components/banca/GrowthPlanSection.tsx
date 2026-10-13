import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Leaf, Loader2, Rocket, ShieldCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBanca } from "@/hooks/useBanca";
import { useCapitalContract } from "@/hooks/useCapitalContract";
import { formatBancaMoney, formatShortDate } from "@/lib/format";
import { daysUntil } from "@/lib/capital";
import type { CapitalPlanId } from "@/lib/types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "growth_plan";

interface GrowthPlan {
  id: CapitalPlanId;
  nameKey: "planoCrescimento.conservative" | "planoCrescimento.balanced" | "planoCrescimento.aggressive";
  descKey: "planoCrescimento.conservativeDesc" | "planoCrescimento.balancedDesc" | "planoCrescimento.aggressiveDesc";
  returnPct: number;
  months: number;
  icon: "leaf" | "analytics" | "rocket";
  color: string;
}

const PLANS: GrowthPlan[] = [
  { id: "conservador", nameKey: "planoCrescimento.conservative", descKey: "planoCrescimento.conservativeDesc", returnPct: 25, months: 3, icon: "leaf", color: "text-success" },
  { id: "equilibrado", nameKey: "planoCrescimento.balanced", descKey: "planoCrescimento.balancedDesc", returnPct: 20, months: 2, icon: "analytics", color: "text-accent" },
  { id: "agressivo", nameKey: "planoCrescimento.aggressive", descKey: "planoCrescimento.aggressiveDesc", returnPct: 15, months: 1, icon: "rocket", color: "text-destructive" },
];

export const planNameKey: Record<CapitalPlanId, GrowthPlan["nameKey"]> = {
  conservador: "planoCrescimento.conservative",
  equilibrado: "planoCrescimento.balanced",
  agressivo: "planoCrescimento.aggressive",
};

const PLAN_ICONS: Record<GrowthPlan["icon"], typeof Leaf> = {
  leaf: Leaf,
  analytics: TrendingUp,
  rocket: Rocket,
};

function readStoredPlan(): CapitalPlanId | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { planId?: CapitalPlanId };
    return parsed.planId ?? null;
  } catch {
    return null;
  }
}

export function GrowthPlanSection({ capital, currency = "usd" }: { capital: number; currency?: "usd" | "aoa" }) {
  const { t } = useTranslation();
  const { config, save } = useBanca();
  const { contract, activate } = useCapitalContract();
  const [selectedId, setSelectedId] = useState<CapitalPlanId>(config.planId as CapitalPlanId);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = readStoredPlan();
    if (stored) setSelectedId(stored);
  }, []);

  const contractActive = contract?.status === "active";
  useEffect(() => {
    if (contractActive && contract) setSelectedId(contract.plan_id);
  }, [contractActive, contract]);

  const selectPlan = (planId: CapitalPlanId) => {
    if (contractActive) return;
    setSelectedId(planId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ planId }));
    save({ ...config, planId }).catch(() => {});
  };

  const plan = PLANS.find((p) => p.id === selectedId) ?? PLANS[0];
  const projectedReturn = capital * (1 + plan.returnPct / 100);
  const profit = projectedReturn - capital;
  const periodLabel =
    plan.months === 1
      ? t("planoCrescimento.monthOne", { count: plan.months })
      : t("planoCrescimento.months", { count: plan.months });

  const activatePlan = async () => {
    if (busy || contractActive) return;
    setBusy(true);
    try {
      await activate(selectedId, currency);
    } catch {
      toast.error(t("planoCrescimento.activateErrorTitle"), {
        description: t("planoCrescimento.activateErrorMsg"),
      });
    } finally {
      setBusy(false);
    }
  };

  if (contractActive && contract) {
    const daysLeft = daysUntil(contract.end_date);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{t("planoCrescimento.title")}</h2>
          <Badge className="border-success/30 bg-success/20 text-success">{t("planoCrescimento.planActive")}</Badge>
        </div>
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-success/10 text-success">
                <ShieldCheck className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{t(planNameKey[contract.plan_id])}</p>
                <p className="text-xs text-muted-foreground">
                  {formatShortDate(contract.start_date)} — {formatShortDate(contract.end_date)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {daysLeft > 0 ? t("capital.contractDaysLeft", { count: daysLeft }) : t("capital.contractEnded")}
              </p>
              <Badge
                className={
                  daysLeft > 0
                    ? "border-success/30 bg-success/20 text-success"
                    : "border-warning/30 bg-warning/20 text-warning"
                }
              >
                {daysLeft > 0 ? t("capital.active") : t("capital.contractEnded")}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Button variant="secondary" disabled className="w-full">
          {t("planoCrescimento.planActive")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">{t("planoCrescimento.title")}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{t("planoCrescimento.select")}</p>

      <div className="space-y-3">
        {PLANS.map((p) => {
          const selected = p.id === selectedId;
          const Icon = PLAN_ICONS[p.icon];
          return (
            <button
              key={p.id}
              onClick={() => selectPlan(p.id)}
              className={cn(
                "w-full rounded-xl border bg-card p-4 text-left transition-colors",
                selected ? "border-success border-2 bg-success/5" : "border-border/60",
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn("flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-secondary", p.color)}>
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{t(p.nameKey)}</p>
                  <p className="truncate text-xs text-muted-foreground">{t(p.descKey)}</p>
                </div>
                <Badge className="border-transparent bg-secondary text-secondary-foreground">+{p.returnPct}%</Badge>
                <span
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 rounded-full border-2",
                    selected ? "border-success bg-success" : "border-muted-foreground/40",
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-2 pt-6">
          <p className="font-semibold">{t("planoCrescimento.projection")}</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("planoCrescimento.investment")}</span>
            <span className="font-semibold">{formatBancaMoney(capital, currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("planoCrescimento.estimatedReturn")}</span>
            <span className="font-semibold text-success">{formatBancaMoney(projectedReturn, currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("planoCrescimento.period")}</span>
            <span className="font-semibold">{periodLabel}</span>
          </div>
          <div className="rounded-lg bg-success/10 py-2.5 text-center">
            <span className="text-xs font-bold text-success">
              {t("planoCrescimento.estimatedProfit", { value: formatBancaMoney(profit, currency) })}
            </span>
          </div>
        </CardContent>
      </Card>

      <Button variant="premium" className="w-full" onClick={activatePlan} disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {t("planoCrescimento.activate")}
      </Button>
    </div>
  );
}
