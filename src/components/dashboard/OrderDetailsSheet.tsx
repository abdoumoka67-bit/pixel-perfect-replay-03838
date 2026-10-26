import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Phone, PhoneCall, PhoneMissed, PhoneOff, CheckCircle2, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "./StatusBadge";
import {
  CALL_LABELS,
  CALL_OUTCOMES,
  ORDER_STATUSES,
  STATUS_LABELS,
  formatDZD,
  friendlyError,
  whatsappLink,
  type CallOutcome,
  type OrderStatus,
} from "@/lib/commerce";
import { sendOrderToYalidine } from "@/lib/yalidine.functions";
import type { Tables } from "@/integrations/supabase/types";

export type Order = Tables<"orders">;

const CALL_ICONS: Record<CallOutcome, typeof Phone> = {
  no_answer_1: PhoneMissed,
  no_answer_2: PhoneOff,
  busy_callback: PhoneCall,
  confirmed: CheckCircle2,
};

export function confirmMessage(o: Order, storeName: string) {
  return `السلام عليكم ${o.customer_name}، معك ${storeName}. نود تأكيد طلبك رقم ORX-${o.order_number} (${o.product_name} × ${o.quantity}) بمبلغ ${formatDZD(o.total)} للتوصيل إلى ${o.commune}، ${o.wilaya_name}. هل تؤكد الطلب؟`;
}

export function useOrderActions() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["order-stats"] });
    qc.invalidateQueries({ queryKey: ["recent-orders"] });
  };
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث حالة الطلب");
      invalidate();
    },
    onError: (e: Error) => toast.error(friendlyError(e.message)),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف الطلب");
      invalidate();
    },
    onError: (e: Error) => toast.error(friendlyError(e.message)),
  });
  const sendFn = useServerFn(sendOrderToYalidine);
  const sendYalidine = useMutation({
    mutationFn: async (id: string) => sendFn({ data: { orderId: id } }),
    onSuccess: (r) => {
      if (r.ok) toast.success(`${r.message} رقم التتبع: ${r.tracking}`);
      else toast.error(r.message);
      invalidate();
    },
    onError: () => toast.error("تعذر الإرسال إلى Yalidine."),
  });
  return { updateStatus, remove, sendYalidine, invalidate };
}

export function OrderDetailsSheet({
  order,
  storeName,
  readOnly,
  onOpenChange,
}: {
  order: Order | null;
  storeName: string;
  readOnly: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const { updateStatus, sendYalidine, invalidate } = useOrderActions();
  const [notes, setNotes] = useState("");
  useEffect(() => setNotes(order?.notes ?? ""), [order?.id, order?.notes]);

  const logs = useQuery({
    queryKey: ["call-logs", order?.id],
    enabled: !!order,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_logs")
        .select("*")
        .eq("order_id", order!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const logCall = useMutation({
    mutationFn: async (outcome: CallOutcome) => {
      const { error } = await supabase
        .from("call_logs")
        .insert({ order_id: order!.id, store_id: order!.store_id, outcome });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تسجيل محاولة الاتصال");
      qc.invalidateQueries({ queryKey: ["call-logs", order?.id] });
      invalidate();
    },
    onError: (e: Error) => toast.error(friendlyError(e.message)),
  });

  const saveNotes = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("orders").update({ notes }).eq("id", order!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ الملاحظة");
      invalidate();
    },
    onError: (e: Error) => toast.error(friendlyError(e.message)),
  });

  return (
    <Sheet open={!!order} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-md">
        {order && (
          <>
            <SheetHeader className="text-start">
              <SheetTitle className="flex items-center gap-3">
                <span className="num">ORX-{order.order_number}</span>
                <StatusBadge status={order.status} />
              </SheetTitle>
              <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("ar-DZ")}</p>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <section className="rounded-2xl bg-muted/60 p-4">
                <p className="text-lg font-medium">{order.customer_name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground num">{order.phone}</p>
                <p className="mt-2 text-sm">
                  {order.commune}، {order.wilaya_code} - {order.wilaya_name}
                  {order.address ? ` · ${order.address}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {order.delivery_type === "home" ? "توصيل للمنزل" : "توصيل للمكتب (Stopdesk)"}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button asChild variant="default">
                    <a href={`tel:${order.phone}`}>
                      <Phone /> اتصال
                    </a>
                  </Button>
                  <Button asChild variant="success">
                    <a href={whatsappLink(order.phone, confirmMessage(order, storeName))} target="_blank" rel="noreferrer">
                      <MessageCircle /> واتساب
                    </a>
                  </Button>
                </div>
              </section>

              <section className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المنتج</span>
                  <span className="font-medium">
                    {order.product_name} × <span className="num">{order.quantity}</span>
                  </span>
                </div>
                {(order.variant_size || order.variant_color) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الخيارات</span>
                    <span>{[order.variant_size, order.variant_color].filter(Boolean).join(" · ")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">سعر المنتجات</span>
                  <span className="num">{formatDZD(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">التوصيل</span>
                  <span className="num">{formatDZD(order.shipping_price)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-medium">
                  <span>الإجمالي</span>
                  <span className="num">{formatDZD(order.total)}</span>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium">سجل محاولات التأكيد</h3>
                  <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">
                    <span className="num">{order.call_attempts}</span> محاولات
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CALL_OUTCOMES.map((o) => {
                    const Icon = CALL_ICONS[o];
                    return (
                      <Button
                        key={o}
                        variant={o === "confirmed" ? "success" : "outline"}
                        size="sm"
                        className="h-auto justify-start whitespace-normal py-2 text-start"
                        disabled={readOnly || logCall.isPending}
                        onClick={() => logCall.mutate(o)}
                      >
                        <Icon /> {CALL_LABELS[o]}
                      </Button>
                    );
                  })}
                </div>
                <ul className="mt-3 space-y-2">
                  {logs.data?.map((l) => (
                    <li key={l.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                      <span>{CALL_LABELS[l.outcome]}</span>
                      <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("ar-DZ")}</span>
                    </li>
                  ))}
                  {logs.data?.length === 0 && <li className="text-xs text-muted-foreground">لم تُسجَّل أي محاولة بعد.</li>}
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-medium">حالة الطلب</h3>
                <Select
                  value={order.status}
                  disabled={readOnly}
                  onValueChange={(v) => updateStatus.mutate({ id: order.id, status: v as OrderStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>

              <section className="space-y-2">
                <h3 className="font-medium">Yalidine</h3>
                {order.tracking_number ? (
                  <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
                    رقم التتبع: <span className="font-medium num">{order.tracking_number}</span>
                  </p>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={readOnly || sendYalidine.isPending}
                    onClick={() => sendYalidine.mutate(order.id)}
                  >
                    {sendYalidine.isPending ? <Loader2 className="animate-spin" /> : <Send />} إرسال إلى Yalidine
                  </Button>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="font-medium">ملاحظات</h3>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} disabled={readOnly} />
                <Button size="sm" variant="secondary" disabled={readOnly || saveNotes.isPending} onClick={() => saveNotes.mutate()}>
                  حفظ الملاحظة
                </Button>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
