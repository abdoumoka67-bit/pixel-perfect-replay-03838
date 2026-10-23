import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_VARIANT, type OrderStatus } from "@/lib/commerce";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function PaymentBadge({ status }: { status: string }) {
  return status === "paid" ? (
    <Badge variant="success">مدفوع</Badge>
  ) : (
    <Badge variant="neutral">عند الاستلام</Badge>
  );
}
