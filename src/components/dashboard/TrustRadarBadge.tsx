import { Shield, ShieldAlert, ShieldCheck, ShieldX, type LucideIcon } from "lucide-react";
import { TRUST_TIER_LABELS, type CustomerTrust, type CustomerTrustTier } from "@/lib/commerce";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const TIER_STYLES: Record<CustomerTrustTier, string> = {
  high: "bg-success-soft text-success",
  neutral: "bg-muted text-muted-foreground",
  risky: "bg-warning-soft text-warning",
  spam: "bg-danger-soft text-danger",
};

const TIER_ICONS: Record<CustomerTrustTier, LucideIcon> = {
  high: ShieldCheck,
  neutral: Shield,
  risky: ShieldAlert,
  spam: ShieldX,
};

/** Compact badge shown next to a customer (name/phone) in tables and sheets. */
export function TrustRadarBadge({ trust, className }: { trust: CustomerTrust | null | undefined; className?: string }) {
  if (!trust) return null;
  const Icon = TIER_ICONS[trust.tier];
  const summary = `(${trust.totalOrders} طلبات: ${trust.delivered} استلام | ${trust.cancelled} إلغاء)`;
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", TIER_STYLES[trust.tier], className)}
      title={summary}
    >
      <Icon className="size-3" strokeWidth={1.8} />
      {TRUST_TIER_LABELS[trust.tier]}
    </span>
  );
}

/** Stats line under the badge: (3 طلبات: 2 استلام | 1 إلغاء). */
export function TrustStatsLine({ trust }: { trust: CustomerTrust | null | undefined }) {
  if (!trust) return null;
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      <span className="num">{trust.totalOrders}</span> طلبات: <span className="num">{trust.delivered}</span> استلام |{" "}
      <span className="num">{trust.cancelled}</span> إلغاء
    </p>
  );
}

/** Prominent alert with reject / block actions, shown only for the spam tier. */
export function SpamShredderAlert({
  onReject,
  onBlock,
  busy,
}: {
  onReject: () => void;
  onBlock: () => void;
  busy?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-danger/25 bg-danger-soft p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger">
          <ShieldX className="size-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-danger">Spam Link Shredder</p>
          <p className="mt-1 text-sm leading-6 text-foreground">
            هذا الرقم سجّل طلبات متكررة سريعاً أو إلغاءات متكررة. ننصح بالتحقق قبل إرسال الطلب لشركة التوصيل.
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="destructive" size="sm" onClick={onReject} disabled={busy}>
          <ShieldX /> رفض الطلب
        </Button>
        <Button variant="outline" size="sm" onClick={onBlock} disabled={busy}>
          حظر الرقم
        </Button>
      </div>
    </div>
  );
}
