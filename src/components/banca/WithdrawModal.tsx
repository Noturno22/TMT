import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_ICONS,
  type Currency,
  type PaymentMethod,
} from "@/lib/plans";
import { formatBancaMoney, formatShortDate } from "@/lib/format";
import { contractEnded, netAfterPenalty } from "@/lib/capital";
import { cn } from "@/lib/utils";

const CURRENCIES: Currency[] = ["usd", "aoa"];

interface WithdrawModalProps {
  available: number;
  balanceCurrency: Currency;
  onClose: () => void;
  onSubmit: (input: { method: PaymentMethod; amount: number; details: string; currency: Currency }) => void;
  busy?: boolean;
  contractEndDate?: string;
  penaltyPct?: number;
  maxAmount?: number;
}

export function WithdrawModal({
  available,
  balanceCurrency,
  onClose,
  onSubmit,
  busy = false,
  contractEndDate,
  penaltyPct,
  maxAmount,
}: WithdrawModalProps) {
  const { t } = useTranslation();
  const amountId = useId();
  const detailsId = useId();
  const [currency, setCurrency] = useState<Currency>(balanceCurrency);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");

  const availableMethods = useMemo(
    () => PAYMENT_METHODS.filter((m) => (currency === "usd" ? m.usd : m.aoa)),
    [currency],
  );
  const selectedMethod = method ? availableMethods.find((m) => m.id === method) : null;
  const currencySymbol = currency === "usd" ? "USD" : "AOA";
  const amountNum = Number(amount.replace(",", "."));
  const isAmountValid = isFinite(amountNum) && amountNum > 0;
  const penaltyActive =
    typeof penaltyPct === "number" && penaltyPct > 0 && !!contractEndDate && !contractEnded(contractEndDate);
  const penaltyAmount = penaltyActive ? amountNum * ((penaltyPct as number) / 100) : 0;
  const netValue = penaltyActive ? netAfterPenalty(amountNum, penaltyPct as number) : amountNum;
  const sameCurrency = currency === balanceCurrency;
  const effectiveMax = maxAmount ?? available;
  const exceedsMax = sameCurrency && isAmountValid && amountNum > effectiveMax;
  const contractFinished = !!contractEndDate && contractEnded(contractEndDate);
  const valid = Boolean(method) && isAmountValid && !exceedsMax && details.trim().length > 0;

  const handleSubmit = () => {
    const parsed = parseFloat(amount.replace(",", "."));
    if (!method || !isFinite(parsed) || parsed <= 0 || !details.trim()) {
      toast.error(t("depositos.invalidWithdraw"));
      return;
    }
    if (exceedsMax) {
      toast.error(t("capital.withdrawAboveBalance"));
      return;
    }
    onSubmit({ method, amount: parsed, details: details.trim(), currency });
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="font-display text-xl">
              {t("depositos.withdrawCta")}
            </DialogTitle>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3">
            <span className="text-sm font-semibold text-muted-foreground">
              {t("depositos.withdrawAvailable")}
            </span>
            <span className="font-semibold text-success">
              {formatBancaMoney(available, balanceCurrency)}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("planos.currency")}</p>
            <div className="flex rounded-full bg-secondary/70 p-1" role="group" aria-label={t("planos.currency")}>
              {CURRENCIES.map((c) => {
                const active = currency === c;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      if (c === currency) return;
                      setCurrency(c);
                      // o metodo anterior pode nao existir na nova moeda
                      setMethod(null);
                    }}
                    className={cn(
                      "relative flex-1 rounded-full py-2 text-sm font-bold transition-colors",
                      active ? "text-background" : "text-muted-foreground",
                    )}
                  >
                    {active ? (
                      <span className="absolute inset-0 rounded-full bg-accent shadow-lg shadow-accent/35" />
                    ) : null}
                    <span className="relative">
                      {c === "usd" ? t("planos.usd") : t("planos.aoa")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("depositos.withdrawMethod")}</p>
            <div className="grid grid-cols-2 gap-3">
              {availableMethods.map((m) => {
                const active = method === m.id;
                const Icon = PAYMENT_METHOD_ICONS[m.icon];
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setMethod(m.id)}
                    style={{ borderColor: m.color, borderWidth: 2 }}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl bg-card p-4 transition-opacity hover:opacity-90",
                      active && "ring-2 ring-accent",
                    )}
                  >
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${m.color}1A`, color: m.color }}
                    >
                      {Icon ? <Icon className="h-7 w-7" /> : null}
                    </div>
                    <span className="text-sm font-bold" style={{ color: m.color }}>
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={amountId} className="text-xs text-muted-foreground">
              {t("depositos.withdrawAmount", { currency: currencySymbol })}
            </Label>
            <Input
              id={amountId}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              aria-invalid={exceedsMax}
            />
            {exceedsMax ? (
              <p role="alert" className="text-xs text-destructive">
                {t("capital.withdrawAboveBalance")}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={detailsId} className="text-xs text-muted-foreground">
              {t("depositos.withdrawDetails")}
            </Label>
            <Textarea
              id={detailsId}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={selectedMethod?.getDetails()}
              rows={2}
            />
          </div>

          {isAmountValid ? (
            <div
              className={cn(
                "space-y-1.5 rounded-xl border p-4",
                penaltyActive ? "border-warning/40 bg-warning/10" : "border-border bg-secondary/40",
              )}
            >
              {penaltyActive ? (
                <>
                  <p className="text-sm font-bold text-warning">{t("capital.penaltyTitle")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("capital.penaltyNotice", {
                      date: formatShortDate(contractEndDate as string),
                      penalty: penaltyPct,
                    })}
                  </p>
                </>
              ) : null}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{t("capital.grossValue")}</p>
                <p className="font-semibold">{formatBancaMoney(amountNum, currency)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t("capital.penaltyLabel", { penalty: penaltyActive ? penaltyPct : 0 })}
                </p>
                <p className={cn("font-semibold", penaltyActive ? "text-warning" : "text-muted-foreground")}>
                  −{formatBancaMoney(penaltyAmount, currency)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{t("capital.netValue")}</p>
                <p className={cn("font-semibold", penaltyActive ? "text-warning" : "text-foreground")}>
                  {formatBancaMoney(netValue, currency)}
                </p>
              </div>
              {!penaltyActive && contractFinished ? (
                <p className="text-xs text-muted-foreground">{t("capital.noPenaltyNotice")}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-col">
          <Button type="button" variant="outline" className="w-full" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button type="button" variant="premium" className="w-full h-[54px]" onClick={handleSubmit} disabled={busy || !valid}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("depositos.withdrawCta")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
