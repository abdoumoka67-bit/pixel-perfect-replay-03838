import { Link } from "@tanstack/react-router";
import { Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyStore } from "@/hooks/use-my-store";
import { useTr } from "@/lib/ui-i18n";

/** Shown in place of a Pro-only page when the store is on Start. */
export function ProLock({ title, description, points }: { title: string; description: string; points: string[] }) {
  const { isOwner } = useMyStore();
  const t = useTr();
  return (
    <div className="mx-auto max-w-xl rounded-3xl border bg-card p-8 text-center shadow-card">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Lock className="size-6" strokeWidth={1.6} />
      </span>
      <span className="mt-5 inline-flex rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Pro</span>
      <h2 className="mt-3 text-2xl font-medium">{title}</h2>
      <p className="mt-2 leading-7 text-muted-foreground">{description}</p>
      <ul className="mx-auto mt-6 max-w-sm space-y-2.5 text-start text-sm">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-success" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      {isOwner ? (
        <Button asChild size="lg" className="mt-7 w-full">
          <Link to="/dashboard/billing">{t("الترقية إلى Pro")}</Link>
        </Button>
      ) : (
        <p className="mt-7 rounded-full bg-secondary px-4 py-3 text-sm text-muted-foreground">{t("اطلب من صاحب المتجر الترقية إلى Pro.")}</p>
      )}
    </div>
  );
}

/** Small "Pro" pill for labels and menu items. */
export function ProPill({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground ${className}`}>
      <Lock className="size-2.5" /> Pro
    </span>
  );
}
