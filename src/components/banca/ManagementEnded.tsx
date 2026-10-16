import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, Leaf, Loader2, Rocket, TrendingUp, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useManagementRequest } from "@/hooks/useManagementRequest";
import { formatBancaMoney } from "@/lib/format";
import { CAPITAL_PLANS } from "@/lib/plans";
import type { CapitalPlanId } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLANS: {
  id: CapitalPlanId;
  nameKey: "planoCrescimento.conservative" | "planoCrescimento.balanced" | "planoCrescimento.aggressive";
  descKey:
    | "planoCrescimento.conservativeDesc"
    | "planoCrescimento.balancedDesc"
    | "planoCrescimento.aggressiveDesc";
  returnPct: number;
  months: number;
  icon: typeof Leaf;
  color: string;
}[] = [
  { id: "conservador", nameKey: "planoCrescimento.conservative", descKey: "planoCrescimento.conservativeDesc", ...CAPITAL_PLANS.conservador, icon: Leaf, color: "text-success" },
  { id: "equilibrado", nameKey: "planoCrescimento.balanced", descKey: "planoCrescimento.balancedDesc", ...CAPITAL_PLANS.equilibrado, icon: TrendingUp, color: "text-accent" },
  { id: "agressivo", nameKey: "planoCrescimento.aggressive", descKey: "planoCrescimento.aggressiveDesc", ...CAPITAL_PLANS.agressivo, icon: Rocket, color: "text-destructive" },
];

export function ManagementEnded({
  finalValue,
  capital,
  currency,
  profitValue,
  defaultPlanId = "conservador",
}: {
  finalValue: number;
  capital: number;
  currency: "usd" | "aoa";
  profitValue: number;
  defaultPlanId?: CapitalPlanId;
}) {
  const { t } = useTranslation();
  const { request, loading, submit } = useManagementRequest();
  const [selectedId, setSelectedId] = useState<CapitalPlanId>(defaultPlanId);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const status = request?.status ?? null;
  const isPending = status === "pending";
  const isRejected = status === "rejected";
  const isProfit = profitValue >= 0;
  const signedMoney = (n: number) => `${n >= 0 ? "+" : "−"}${formatBancaMoney(Math.abs(n), currency)}`;

  const send = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await submit(selectedId, currency, note);
      setNote("");
      toast.success(t("capital.requestSentTitle"), {
        description: t("capital.requestSentMsg"),
      });
    } catch {
      toast.error(t("capital.requestErrorTitle"), {
        description: t("capital.requestErrorMsg"),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative space-y-3 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 to-warning/15 p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-foreground/70">
            {t("capital.currentBalance")}
          </p>
          <Badge className="border-warning/30 bg-warning/20 text-warning">
            {t("capital.contractEnded")}
          </Badge>
        </div>
        <p className="font-mono text-4xl font-bold tracking-wide text-foreground">
          {formatBancaMoney(finalValue, currency)}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {t("capital.deposited")}
            {formatBancaMoney(capital, currency)}
          </p>
          <p className={cn("text-xs font-semibold", isProfit ? "text-success" : "text-destructive")}>
            {signedMoney(profitValue)}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">{t("capital.endedDesc")}</p>
      </div>

      {isPending ? (
        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t("capital.requestPending")}</p>
              <p className="text-sm text-muted-foreground">{t("capital.requestPendingDesc")}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 pt-6">
            {isRejected ? (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-destructive">
                <XCircle className="h-4 w-4 shrink-0" />
                <p className="text-xs font-semibold">{t("capital.requestRejected")}</p>
              </div>
            ) : null}

            <div>
              <p className="font-semibold">{t("capital.newManagementTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("capital.newManagementDesc")}</p>
            </div>

            <div className="space-y-2.5" role="radiogroup" aria-label={t("planoCrescimento.select")}>
              {PLANS.map((p) => {
                const selected = p.id === selectedId;
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSelectedId(p.id)}
                    className={cn(
                      "w-full rounded-xl border bg-card p-3.5 text-left transition-colors",
                      selected ? "border-success border-2 bg-success/5" : "border-border/60",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-secondary", p.color)}>
                        <Icon className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{t(p.nameKey)}</p>
                        <p className="truncate text-xs text-muted-foreground">{t(p.descKey)}</p>
                      </div>
                      <Badge className="border-transparent bg-secondary text-secondary-foreground">
                        +{p.returnPct}%
                      </Badge>
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

            <div className="space-y-2">
              <label htmlFor="mgmt-note" className="text-xs font-semibold text-muted-foreground">
                {t("capital.newManagementNote")}
              </label>
              <textarea
                id="mgmt-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder={t("capital.newManagementNotePlaceholder")}
                className="w-full resize-none rounded-xl border border-border/60 bg-card p-3 text-sm outline-none focus:border-accent"
              />
            </div>

            <Button variant="premium" className="w-full" onClick={send} disabled={busy || loading}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("capital.newManagementCta")}
            </Button>
          </CardContent>
        </Card>
      )}

      {status === "approved" ? (
        <div className="flex items-center gap-2 rounded-xl bg-success/10 p-3 text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p className="text-xs font-semibold">{t("capital.requestApproved")}</p>
        </div>
      ) : null}
    </div>
  );
}
