import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

function getStorageKey(userId?: string) {
  return `tmt_onboarding_completed_${userId ?? "guest"}`;
}

const STEPS = [
  { titleKey: "tour.step1Title", descKey: "tour.step1Desc" },
  { titleKey: "tour.step2Title", descKey: "tour.step2Desc" },
  { titleKey: "tour.step3Title", descKey: "tour.step3Desc" },
  { titleKey: "tour.step4Title", descKey: "tour.step4Desc" },
  { titleKey: "tour.step5Title", descKey: "tour.step5Desc" },
  { titleKey: "tour.step6Title", descKey: "tour.step6Desc" },
];

export function OnboardingTour() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (loading) return;
    const key = getStorageKey(user?.id);
    let completed = false;
    try { completed = localStorage.getItem(key) === "1"; } catch { completed = false; }
    setShow(!completed);
  }, [user?.id, loading]);

  const complete = () => {
    setShow(false);
    try { localStorage.setItem(getStorageKey(user?.id), "1"); } catch { /* ignore */ }
  };

  if (!show) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) complete(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(current.titleKey)}</DialogTitle>
          <DialogDescription>{t(current.descKey)}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {step + 1} / {STEPS.length}
        </p>
        <DialogFooter className="flex-row justify-between">
          <Button variant="ghost" onClick={complete}>
            {t("tour.skip")}
          </Button>
          <Button onClick={() => (isLast ? complete() : setStep(step + 1))}>
            {isLast ? t("tour.finish") : t("tour.next")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
