import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

function getStorageKey(subPeriodEnd?: string | null) {
  return `premium_welcome_seen_${subPeriodEnd ?? "none"}`;
}

export function PremiumWelcomeModal() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { subscription, isPremium } = useSubscription();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user || !isPremium || !subscription?.current_period_end) { setShow(false); return; }
    const key = getStorageKey(subscription.current_period_end);
    try {
      setShow(localStorage.getItem(key) !== "1");
    } catch { setShow(true); }
  }, [user, isPremium, subscription?.current_period_end]);

  const close = () => {
    setShow(false);
    const key = getStorageKey(subscription?.current_period_end);
    try { localStorage.setItem(key, "1"); } catch { /* ignore */ }
  };

  if (!show) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("premiumWelcome.title")}</DialogTitle>
          <DialogDescription>{t("premiumWelcome.body")}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>{t("premiumWelcome.perkBank")}</li>
          <li>{t("premiumWelcome.perkSignals")}</li>
          <li>{t("premiumWelcome.perkChannels")}</li>
          <li>{t("premiumWelcome.perkStore")}</li>
        </ul>
        <DialogFooter className="flex-row justify-between">
          <Button variant="ghost" onClick={close}>{t("common.notNow")}</Button>
          <Button asChild>
            <Link to="/banca" onClick={close}>{t("premiumWelcome.ctaBank")}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
