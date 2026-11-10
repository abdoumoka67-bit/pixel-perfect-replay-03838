import { Megaphone } from "lucide-react";
import { attributionFromJson, attributionLabel } from "@/lib/attribution";
import { useTr } from "@/lib/ui-i18n";

/**
 * Shows which ad produced the order: the source and campaign captured on the
 * storefront (UTM / click ids) and stored with the order, so it survives any
 * later navigation. Orders without attribution read "Direct visit".
 */
export function AttributionLine({ value }: { value: unknown }) {
  const t = useTr();
  const attribution = attributionFromJson(value);
  const label = attributionLabel(attribution);
  const source = attribution?.source?.toLowerCase() ?? "";
  const dot = /facebook|meta|instagram|(^|\b)fb\b|(^|\b)ig\b/.test(source)
    ? "bg-[#1877F2]"
    : source.includes("tiktok")
      ? "bg-[#FE2C55]"
      : "bg-muted-foreground";

  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-2">
      <Megaphone className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{t("مصدر الطلب")}</p>
        {label ? (
          <p
            className="mt-0.5 flex items-center gap-1.5 text-xs font-medium"
            title={[attribution?.referrer, attribution?.landing].filter(Boolean).join(" · ")}
          >
            <span className={`size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
            <span className="truncate" dir="auto">
              {label}
            </span>
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">{t("زيارة مباشرة")}</p>
        )}
      </div>
    </div>
  );
}
