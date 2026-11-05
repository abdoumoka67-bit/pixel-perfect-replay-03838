import { STATUS_LABELS, type LanguageCode, type OrderStatus } from "./commerce";
import { tr } from "./ui-i18n";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;

function cell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV with a UTF-8 BOM so Excel opens the exported text correctly. */
export function ordersToCsv(orders: Order[], language: LanguageCode = "ar"): string {
  const header = [
    "رقم الطلب",
    "التاريخ",
    "الزبون",
    "الهاتف",
    "الولاية",
    "البلدية",
    "العنوان",
    "نوع التوصيل",
    "المنتج",
    "المقاس",
    "اللون",
    "الكمية",
    "سعر المنتج",
    "التوصيل",
    "الإجمالي",
    "الحالة",
    "محاولات الاتصال",
    "رقم التتبع",
  ].map((label) => tr(language, label));
  const rows = orders.map((o) => [
    `ORX-${o.order_number}`,
    new Date(o.created_at).toLocaleString("fr-DZ"),
    o.customer_name,
    o.phone,
    `${o.wilaya_code} - ${o.wilaya_name}`,
    o.commune,
    o.address ?? "",
    o.delivery_type === "home" ? tr(language, "للمنزل") : tr(language, "للمكتب"),
    o.product_name,
    o.variant_size ?? "",
    o.variant_color ?? "",
    o.quantity,
    o.unit_price,
    o.shipping_price,
    o.total,
    tr(language, STATUS_LABELS[o.status as OrderStatus]),
    o.call_attempts,
    o.tracking_number ?? "",
  ]);
  return "\uFEFF" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
}

export function downloadText(content: string, filename: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
