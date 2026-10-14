import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NETWORK_BY_ID, type ParsedNetworkLink } from "@/lib/communitySocial";

const EMBED_HEIGHT: Record<string, string> = {
  youtube: "aspect-video",
  x: "min-h-[320px]",
  tiktok: "aspect-[9/16] max-h-[560px]",
  instagram: "aspect-square max-h-[560px]",
  telegram: "min-h-[320px]",
};

export function NetworkEmbed({
  link,
  caption,
}: {
  link: ParsedNetworkLink;
  caption?: string;
}) {
  const { t } = useTranslation();
  const meta = NETWORK_BY_ID[link.network];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-secondary/30">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <span
          className="inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[10px] font-black uppercase"
          style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
        >
          {meta.label.split(" ")[0]}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {t("social.embedFrom", { network: meta.label })}
        </span>
        <a
          href={link.external_url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          {t("social.openOn", { network: meta.label.split(" ")[0] })}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {link.embed_url ? (
        <div className={`w-full ${EMBED_HEIGHT[link.network] ?? "aspect-video"}`}>
          <iframe
            src={link.embed_url}
            title={meta.label}
            className="h-full w-full"
            loading="lazy"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="no-referrer-when-downgrade"
            scrolling="no"
          />
        </div>
      ) : (
        <a
          href={link.external_url}
          target="_blank"
          rel="noreferrer"
          className="block px-4 py-6 text-sm text-primary hover:underline"
        >
          {link.external_url}
        </a>
      )}

      {caption ? <p className="border-t border-border/60 px-3 py-2 text-sm">{caption}</p> : null}
    </div>
  );
}
