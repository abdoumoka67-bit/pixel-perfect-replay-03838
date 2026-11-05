import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_VARIANT, type OrderStatus } from "@/lib/commerce";
import { useTr } from "@/lib/ui-i18n";

export function StatusBadge({ status }: { status: OrderStatus }) {
  const t = useTr();
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      <span className="size-1.5 rounded-full bg-current" />
      {t(STATUS_LABELS[status])}
    </Badge>
  );
}

export function PaymentBadge({ status }: { status: string }) {
  const t = useTr();
  return status === "paid" ? (
    <Badge variant="success">{t("مدفوع")}</Badge>
  ) : (
    <Badge variant="neutral">{t("عند الاستلام")}</Badge>
  );
}
