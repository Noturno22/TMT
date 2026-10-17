import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const ADSENSE_SCRIPT_ID = "adsbygoogle-js";

function ensureAdsenseScript(client: string) {
  if (typeof document === "undefined") return;
  if (document.getElementById(ADSENSE_SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = ADSENSE_SCRIPT_ID;
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  document.head.appendChild(script);
}

interface AdSlotProps {
  /** Ad unit id (data-ad-slot). Cai para VITE_GOOGLE_ADS_SLOT quando omitido. */
  slot?: string;
  /** data-ad-format (auto, fluid, rectangle, horizontal, vertical). */
  format?: string;
  className?: string;
  /** Texto mostrado no placeholder de desenvolvimento. */
  label?: string;
}

/**
 * Slots de anuncio Google AdSense.
 * - Com VITE_GOOGLE_ADS_CLIENT + slot definidos: mostra o anuncio real.
 * - Sem configuracao: placeholder tracejado em desenvolvimento, nada em producao.
 */
export function AdSlot({ slot, format = "auto", className, label }: AdSlotProps) {
  const { t } = useTranslation();
  const client = import.meta.env.VITE_GOOGLE_ADS_CLIENT?.trim();
  const defaultSlot = import.meta.env.VITE_GOOGLE_ADS_SLOT?.trim();
  const adSlot = (slot ?? defaultSlot ?? "").trim();
  const configured = Boolean(client && adSlot);
  const pushed = useRef(false);

  useEffect(() => {
    if (!configured || !client) return;
    ensureAdsenseScript(client);
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense indisponivel (bloqueador, rede): ignora silenciosamente.
    }
  }, [configured, client]);

  if (configured) {
    return (
      <div className={cn("my-6 flex justify-center", className)}>
        <ins
          className="adsbygoogle block w-full"
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={adSlot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  if (import.meta.env.DEV) {
    return (
      <div
        className={cn(
          "my-6 flex min-h-[90px] items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20",
          className,
        )}
        aria-hidden="true"
      >
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          {label ?? t("ads.placeholder")}
        </span>
      </div>
    );
  }

  return null;
}
