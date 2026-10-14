import { motion } from "framer-motion";
import { ArrowDownToLine, PartyPopper, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { formatBancaMoney } from "@/lib/format";
import type { Currency } from "@/lib/plans";
import { cn } from "@/lib/utils";

const CONFETTI_COLORS = ["#6366F1", "#00C853", "#FFB020", "#EF4444", "#38BDF8", "#F472B6"];

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 48 }, (_, i) => {
        const left = (i * 37) % 100;
        const delay = ((i * 13) % 24) / 10;
        const duration = 2.4 + ((i * 7) % 22) / 10;
        const size = 6 + (i % 5) * 2;
        return (
          <motion.span
            key={i}
            className="absolute top-[-12%] block rounded-[2px]"
            style={{
              left: `${left}%`,
              width: size,
              height: size * 1.6,
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            }}
            initial={{ y: "-20%", opacity: 0, rotate: 0 }}
            animate={{ y: "125%", opacity: [0, 1, 1, 0], rotate: 360 }}
            transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
          />
        );
      })}
    </div>
  );
}

type GoalReachedProps = {
  finalValue: number;
  currency: Currency;
  returnPct: number;
  profitValue: number;
  onWithdraw: () => void;
};

export function GoalReached({ finalValue, currency, returnPct, profitValue, onWithdraw }: GoalReachedProps) {
  const { t } = useTranslation();
  const signedProfit = `${profitValue >= 0 ? "+" : "−"}${formatBancaMoney(Math.abs(profitValue), currency)}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-success/30 bg-gradient-to-br from-success/25 via-accent/15 to-primary/10 p-6 text-center"
    >
      <Confetti />
      <div className="relative space-y-4">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 12 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/20"
        >
          <Trophy className="h-8 w-8 text-success" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xs font-bold uppercase tracking-[0.3em] text-success"
        >
          {t("capital.goalReachedTitle")}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 150, damping: 14 }}
          className="font-mono text-5xl font-extrabold tracking-tight text-foreground"
        >
          {formatBancaMoney(finalValue, currency)}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mx-auto max-w-sm text-sm text-muted-foreground"
        >
          {t("capital.goalReachedDesc")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-2 text-xs"
        >
          <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/15 px-3 py-1 font-semibold text-success">
            <PartyPopper className="h-3.5 w-3.5" />
            {t("capital.target")}: +{returnPct}%
          </span>
          <span className={cn("font-semibold", profitValue >= 0 ? "text-success" : "text-destructive")}>
            {signedProfit}
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Button
            onClick={onWithdraw}
            className="h-12 w-full bg-success text-white hover:bg-success/90 sm:w-auto sm:px-8"
          >
            <ArrowDownToLine className="mr-2 h-4 w-4" />
            {t("capital.requestWithdrawal")}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
