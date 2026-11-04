import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { formatDZD } from "@/lib/commerce";
import type { Order } from "./OrderDetailsSheet";

/**
 * A6 thermal label (100x150mm). Pure black & white (#000000 / #FFFFFF) for
 * thermal sticker printers. Screen shows a preview; printing renders an
 * exact-size copy through a body-level portal (`.a6-print-root`).
 */
export function ShippingLabelModal({
  open,
  onOpenChange,
  orders,
  storeName,
  storePhone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: Order[];
  storeName: string;
  storePhone: string;
}) {
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>بوليصة A6 حرارية ({orders.length} طلب)</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto rounded-xl bg-muted p-4">
            {orders.map((o) => (
              <A6Label key={o.id} order={o} storeName={storeName} storePhone={storePhone} preview />
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs leading-6 text-muted-foreground">
              مقاس الورق: 100×150 ملم — الطابعة الحرارية. لا طُبع اللون بإعدادات النظام.
            </p>
            <Button variant="brand" onClick={() => window.print()} disabled={orders.length === 0}>
              <Printer /> طباعة
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {open && createPortal(
        <div className="a6-print-root">
          {orders.map((o, i) => (
            <A6Label key={o.id} order={o} storeName={storeName} storePhone={storePhone} last={i === orders.length - 1} />
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

function A6Label({
  order,
  storeName,
  storePhone,
  preview = false,
  last = true,
}: {
  order: Order;
  storeName: string;
  storePhone: string;
  preview?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={[
        "a6-label h-[150mm] w-[100mm] overflow-hidden bg-white text-[#000000]",
        preview ? "rounded-lg border-2 border-dashed border-border" : "",
        last ? "" : "a6-label-break",
      ].join(" ")}
      style={preview ? { transform: "scale(0.9)", transformOrigin: "top left" } : undefined}
    >
      <div className="flex h-full flex-col p-[6mm] leading-tight">
        {/* Store + order barcode */}
        <div className="flex items-start justify-between border-b-2 border-[#000000] pb-2">
          <div>
            <p className="text-[15px] font-bold">{storeName || "متجر oranix"}</p>
            <p className="mt-0.5 text-[9px]">شحن الدفع عند الاستلام (COD)</p>
          </div>
          <span className="rounded border-2 border-[#000000] px-1.5 py-0.5 text-[11px] font-bold num" dir="ltr">
            #{order.order_number}
          </span>
        </div>

        {/* Barcode representation */}
        <div className="mt-2 flex items-end gap-2">
          <span
            aria-hidden="true"
            className="block h-[34px] w-[54mm]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #000000 0 2px, transparent 2px 4px, #000000 4px 7px, transparent 7px 9px, #000000 9px 10px, transparent 10px 14px)",
            }}
          />
          <span className="pb-0.5 text-[9px] num" dir="ltr">ORX-{order.order_number}</span>
        </div>

        {/* Recipient */}
        <div className="mt-3">
          <p className="text-[9px]">الزبون</p>
          <p className="text-[15px] font-bold">{order.customer_name}</p>
          <p className="mt-1 text-[20px] font-bold">
            {order.wilaya_code} - {order.wilaya_name}
          </p>
          <p className="mt-0.5 text-[11px] font-medium">{order.commune}</p>
          {order.address && <p className="mt-0.5 text-[10px] leading-snug">{order.address}</p>}
        </div>

        {/* Phones */}
        <div className="mt-2 grid grid-cols-2 gap-0 border-2 border-[#000000]">
          <div className="border-s-2 border-[#000000] p-1.5">
            <p className="text-[9px]">هاتف 1</p>
            <p className="text-[12px] font-bold num" dir="ltr">{order.phone}</p>
          </div>
          <div className="p-1.5">
            <p className="text-[9px]">هاتف 2</p>
            <p className="text-[12px] font-bold num" dir="ltr">{storePhone || "—"}</p>
          </div>
        </div>

        {/* COD amount */}
        <div className="mt-2 border-2 border-[#000000] p-2 text-center">
          <p className="text-[10px] font-medium">المبلغ المطلوب (دفع عند الاستلام)</p>
          <p className="mt-0.5 text-[24px] font-bold num">{formatDZD(order.total)}</p>
        </div>

        {/* Carrier + notes */}
        <div className="mt-auto border-t border-dashed border-[#000000] pt-1.5">
          <p className="text-[11px] font-bold">
            شركة التوصيل: {order.delivery_type === "home" ? "توصيل للمنزل" : "Stopdesk — المكتب"}
          </p>
          {order.notes && <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug">ملاحظات: {order.notes}</p>}
        </div>
      </div>
    </div>
  );
}
