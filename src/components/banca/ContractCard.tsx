import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBancaMoney, formatShortDate } from "@/lib/format";
import { daysUntil } from "@/lib/capital";
import { cn } from "@/lib/utils";
import type { CapitalContract } from "@/lib/types";
import { planNameKey } from "@/components/banca/GrowthPlanSection";

interface ContractCardProps {
  contract: CapitalContract;
  goalReached?: boolean;
}

export function ContractCard({ contract, goalReached }: ContractCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const daysLeft = daysUntil(contract.end_date);
  const active = contract.status === "active" && daysLeft > 0;
  const achieved = Boolean(goalReached) && active;

  const rows: { label: string; value: string; color?: string }[] = [
    { label: t("capital.contractPlan"), value: t(planNameKey[contract.plan_id]) },
    { label: t("capital.contractStart"), value: formatShortDate(contract.start_date) },
    { label: t("capital.contractEnd"), value: formatShortDate(contract.end_date) },
    { label: t("capital.contractCapital"), value: formatBancaMoney(contract.capital_inicial, contract.currency) },
    { label: t("capital.contractPenalty"), value: `${contract.penalty_pct}%`, color: "text-warning" },
  ];

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{t("capital.contractTitle")}</p>
          <Badge
            className={
              achieved || active
                ? "border-success/30 bg-success/20 text-success"
                : "border-warning/30 bg-warning/20 text-warning"
            }
          >
            {achieved
              ? t("capital.goalReachedTitle")
              : active
                ? t("capital.active")
                : t("capital.contractEnded")}
          </Badge>
        </div>
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{row.label}</p>
            <p className={cn("font-semibold", row.color)}>{row.value}</p>
          </div>
        ))}
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-muted-foreground">
            {achieved
              ? t("capital.goalReachedDesc")
              : daysLeft > 0
                ? t("capital.contractDaysLeft", { count: daysLeft })
                : t("capital.contractEnded")}
          </p>
          <Button variant="ghost" onClick={() => setOpen(true)}>
            {t("capital.viewContract")}
          </Button>
        </div>
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) setOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("capital.contractTermsTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("capital.contractTermsBody", { penalty: contract.penalty_pct })}
          </p>
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{row.label}</p>
                <p className={cn("font-semibold", row.color)}>{row.value}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("planos.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
