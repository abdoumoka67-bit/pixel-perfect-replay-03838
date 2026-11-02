import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { formatDZD, START_MONTHLY_ORDER_LIMIT, MAX_TEAM_USERS } from "@/lib/commerce";
import { cn } from "@/lib/utils";

export type PlanCardData = { id: string; name: string; price: number; months: number; tier: string };

const START_FEATURES = [
  `حتى ${START_MONTHLY_ORDER_LIMIT} طلب شهرياً`,
  "صفحة هبوط لكل منتج بفورم 58 ولاية",
  "سجل الاتصال وتأكيد الطلبات",
  "أسعار توصيل لكل ولاية + Yalidine",
  "تصدير الطلبات Excel",
];

const PRO_FEATURES = [
  "طلبات غير محدودة",
  "Meta Pixel و TikTok Pixel",
  "إحصائيات متقدمة للمبيعات",
  `فريق عمل حتى ${MAX_TEAM_USERS} مستخدمين`,
  "سجل الأنشطة: من فعل ماذا ومتى",
  "مخزون وتصنيفات المنتجات",
];

/**
 * Start (white) and Pro (charcoal) cards. With `onSelect` the cards become
 * selectable (billing); otherwise each card renders the given `action`.
 */
export function PlanCards({
  plans,
  selectedId,
  onSelect,
  action,
}: {
  plans: PlanCardData[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  action?: (plan: PlanCardData) => ReactNode;
}) {
  const sorted = [...plans].sort((a, b) => (a.tier === b.tier ? 0 : a.tier === "start" ? -1 : 1));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sorted.map((p) => {
        const pro = p.tier === "pro";
        const features = pro ? PRO_FEATURES : START_FEATURES;
        const selected = selectedId === p.id;
        const body = (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className={cn("text-lg font-medium", pro ? "text-sidebar-foreground" : "text-foreground")}>{p.name}</p>
              {pro && (
                <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-foreground">الأفضل للفرق</span>
              )}
            </div>
            <p className="mt-4 flex items-baseline gap-1.5">
              <span className="text-4xl font-medium num">{formatDZD(p.price)}</span>
              <span className={cn("text-sm", pro ? "text-sidebar-muted" : "text-muted-foreground")}>
                / {p.months === 1 ? "شهر" : `${p.months} أشهر`}
              </span>
            </p>
            {pro && <p className="mt-1 text-sm text-sidebar-muted">كل ميزات Start، وزيادة:</p>}
            <ul className="mt-5 space-y-3 text-sm">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                      pro ? "bg-card/15 text-sidebar-foreground" : "bg-brand-soft text-brand",
                    )}
                  >
                    <Check className="size-3" />
                  </span>
                  <span className={pro ? "text-sidebar-foreground/90" : ""}>{f}</span>
                </li>
              ))}
            </ul>
          </>
        );
        const cardClass = cn(
          "relative flex flex-col rounded-3xl p-6 text-start transition-all",
          pro ? "bg-sidebar text-sidebar-foreground shadow-float" : "border bg-card shadow-card",
        );
        if (onSelect) {
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              aria-pressed={selected}
              className={cn(cardClass, "outline-none", selected ? "ring-2 ring-brand ring-offset-2 ring-offset-background" : "")}
            >
              {body}
              <span
                className={cn(
                  "mt-6 flex h-11 items-center justify-center rounded-full text-sm font-medium",
                  pro ? "bg-card text-foreground" : "bg-primary text-primary-foreground",
                )}
              >
                {selected ? "الخطة المختارة ✓" : `اختر ${p.name}`}
              </span>
            </button>
          );
        }
        return (
          <div key={p.id} className={cardClass}>
            {body}
            <div className="mt-auto pt-6">{action?.(p)}</div>
          </div>
        );
      })}
    </div>
  );
}
