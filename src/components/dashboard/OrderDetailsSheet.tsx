import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  MessageCircle,
  Phone,
  PhoneCall,
  PhoneMissed,
  PhoneOff,
  CheckCircle2,
  Send,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "./StatusBadge";
import { SpamShredderAlert, TrustRadarBadge, TrustStatsLine } from "./TrustRadarBadge";
import {
  CALL_LABELS,
  CALL_OUTCOMES,
  ORDER_STATUSES,
  STATUS_LABELS,
  formatDZD,
  friendlyError,
  whatsappLink,
  type CallOutcome,
  type CustomerTrust,
  type OrderStatus,
} from "@/lib/commerce";
import { useTr, useTranslatedMessage, useUiLanguage } from "@/lib/ui-i18n";
import { sendOrderToYalidine } from "@/lib/yalidine.functions";
import { carrierById } from "@/lib/delivery-carriers";
import { AttributionLine } from "./AttributionLine";
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
  const t = useTr();
  const msg = useTranslatedMessage();
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
      toast.success(t("تم تحديث حالة الطلب"));
      invalidate();
    },
    onError: (e: Error) => toast.error(t(friendlyError(e.message))),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("تم حذف الطلب"));
      invalidate();
    },
    onError: (e: Error) => toast.error(t(friendlyError(e.message))),
  });
  const sendFn = useServerFn(sendOrderToYalidine);
  const sendYalidine = useMutation({
    mutationFn: async (id: string) => sendFn({ data: { orderId: id } }),
    onSuccess: (r) => {
      if (r.ok)
        toast.success(`${msg(r.message)} ${t("رقم التتبع: {tracking}", { tracking: r.tracking })}`);
      else toast.error(msg(r.message));
      invalidate();
    },
    onError: () => toast.error(t("تعذر الإرسال إلى Yalidine.")),
  });
  return { updateStatus, remove, sendYalidine, invalidate };
}

export function OrderDetailsSheet({
  order,
  storeName,
  readOnly,
  trust,
  onOpenChange,
}: {
  order: Order | null;
  storeName: string;
  readOnly: boolean;
  trust?: CustomerTrust | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTr();
  const language = useUiLanguage();
  const locale = language === "ar" ? "ar-DZ" : language === "fr" ? "fr-DZ" : "en-GB";
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
      toast.success(t("تم تسجيل محاولة الاتصال"));
      qc.invalidateQueries({ queryKey: ["call-logs", order?.id] });
      invalidate();
    },
    onError: (e: Error) => toast.error(t(friendlyError(e.message))),
  });

  const saveNotes = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("orders").update({ notes }).eq("id", order!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("تم حفظ الملاحظة"));
      invalidate();
    },
    onError: (e: Error) => toast.error(t(friendlyError(e.message))),
  });

  const blocked = useQuery({
    queryKey: ["blocked-phone", order?.store_id, order?.phone],
    enabled: !!order,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("block_phones")
        .select("id")
        .eq("store_id", order!.store_id)
        .eq("phone", order!.phone)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });

  const connectedCarriers = useQuery({
    queryKey: ["connected-carriers", order?.store_id],
    enabled: !!order,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carrier_integrations")
        .select("carrier_id, token, api_key, account_id, updated_at")
        .eq("store_id", order!.store_id)
        .eq("connected", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const yalidineLinked = useQuery({
    queryKey: ["yalidine-linked", order?.store_id],
    enabled: !!order,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("yalidine_credentials")
        .select("store_id")
        .eq("store_id", order!.store_id)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });

  const configuredCarrierIds =
    connectedCarriers.data
      ?.filter((row) => Boolean(row.token || row.api_key || row.account_id))
      .map((row) => row.carrier_id) ?? [];
  const shippingCarrierId = yalidineLinked.data
    ? "yalidine"
    : (configuredCarrierIds.find((id) => id !== "yalidine") ?? null);
  const shippingCarrier = shippingCarrierId ? carrierById(shippingCarrierId) : undefined;

  const blockSpam = useMutation({
    mutationFn: async () => {
      if (!order) return;
      const { error } = await supabase.from("block_phones").upsert(
        {
          store_id: order.store_id,
          phone: order.phone,
          reason: `رادار الثقة — طلب ORX-${order.order_number}`,
        },
        { onConflict: "store_id,phone", ignoreDuplicates: true },
      );
      if (error) throw error;
      if (order.status !== "cancelled") {
        const { error: e2 } = await supabase
          .from("orders")
          .update({ status: "cancelled" as OrderStatus })
          .eq("id", order.id);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      toast.success(t("تم حظر الرقم ورفض الطلب"));
      qc.invalidateQueries({ queryKey: ["blocked-phone"] });
      invalidate();
    },
    onError: (e: Error) => toast.error(t(friendlyError(e.message))),
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
              <p className="text-xs text-muted-foreground">
                {new Date(order.created_at).toLocaleString(locale)}
              </p>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <section className="rounded-2xl bg-muted/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-medium">{order.customer_name}</p>
                  <TrustRadarBadge trust={trust} />
                  {blocked.data && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                      {t("محظور")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="mt-0.5 text-sm text-muted-foreground num">{order.phone}</p>
                  {!blocked.data && !readOnly && (
                    <button
                      type="button"
                      className="mt-0.5 text-xs text-destructive underline-offset-2 hover:underline disabled:opacity-50"
                      disabled={blockSpam.isPending}
                      onClick={() => blockSpam.mutate()}
                    >
                      {t("حظر الرقم")}
                    </button>
                  )}
                </div>
                <TrustStatsLine trust={trust} />
                {trust?.tier === "spam" && (
                  <div className="mt-3">
                    <SpamShredderAlert
                      busy={blockSpam.isPending}
                      onReject={() => updateStatus.mutate({ id: order.id, status: "cancelled" })}
                      onBlock={() => blockSpam.mutate()}
                    />
                  </div>
                )}
                <p className="mt-2 text-sm">
                  {order.commune}، {order.wilaya_code} - {order.wilaya_name}
                  {order.address ? ` · ${order.address}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {order.delivery_type === "home"
                    ? t("توصيل للمنزل")
                    : t("توصيل للمكتب (Stopdesk)")}
                </p>
                <AttributionLine value={order.attribution} />
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button asChild variant="default">
                    <a href={`tel:${order.phone}`}>
                      <Phone /> {t("اتصال")}
                    </a>
                  </Button>
                  <Button asChild variant="success">
                    <a
                      href={whatsappLink(order.phone, confirmMessage(order, storeName))}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle /> {t("واتساب")}
                    </a>
                  </Button>
                </div>
              </section>

              <section className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("المنتج")}</span>
                  <span className="font-medium">
                    {order.product_name} × <span className="num">{order.quantity}</span>
                  </span>
                </div>
                {(order.variant_size || order.variant_color) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("الخيارات")}</span>
                    <span>
                      {[order.variant_size, order.variant_color].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("سعر المنتجات")}</span>
                  <span className="num">{formatDZD(order.subtotal, language)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("التوصيل")}</span>
                  <span className="num">{formatDZD(order.shipping_price, language)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-medium">
                  <span>{t("الإجمالي")}</span>
                  <span className="num">{formatDZD(order.total, language)}</span>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium">{t("سجل محاولات التأكيد")}</h3>
                  <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">
                    <span className="num">{order.call_attempts}</span> {t("محاولات")}
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
                        <Icon /> {t(CALL_LABELS[o])}
                      </Button>
                    );
                  })}
                </div>
                <ul className="mt-3 space-y-2">
                  {logs.data?.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <span>{t(CALL_LABELS[l.outcome])}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(l.created_at).toLocaleString(locale)}
                      </span>
                    </li>
                  ))}
                  {logs.data?.length === 0 && (
                    <li className="text-xs text-muted-foreground">
                      {t("لم تُسجَّل أي محاولة بعد.")}
                    </li>
                  )}
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-medium">{t("حالة الطلب")}</h3>
                <Select
                  value={order.status}
                  disabled={readOnly}
                  onValueChange={(v) =>
                    updateStatus.mutate({ id: order.id, status: v as OrderStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(STATUS_LABELS[s])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>

              <section className="space-y-2">
                <h3 className="font-medium">{t("الشحن إلى شركة التوصيل")}</h3>
                {order.tracking_number ? (
                  <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
                    {t("رقم التتبع:")}{" "}
                    <span className="font-medium num">{order.tracking_number}</span>
                  </p>
                ) : shippingCarrier ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {t("الشركة المتصلة: {name}", { name: t(shippingCarrier.name) })}
                    </p>
                    {shippingCarrier.id === "yalidine" ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={readOnly || sendYalidine.isPending}
                        onClick={() => sendYalidine.mutate(order.id)}
                      >
                        {sendYalidine.isPending ? <Loader2 className="animate-spin" /> : <Send />}{" "}
                        {t("إرسال إلى Yalidine")}
                      </Button>
                    ) : (
                      <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs leading-5 text-warning">
                        {t(
                          "الشحن التلقائي عبر {name} قيد التجهيز. يمكنك تأكيد الطلب وطباعة قائمة التوصيل يدوياً.",
                          { name: t(shippingCarrier.name) },
                        )}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
                    {t("اربط شركة توصيل أولاً من صفحة أسعار التوصيل لتفعيل الشحن التلقائي.")}
                  </p>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="font-medium">{t("ملاحظات")}</h3>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  disabled={readOnly}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={readOnly || saveNotes.isPending}
                  onClick={() => saveNotes.mutate()}
                >
                  {t("حفظ الملاحظة")}
                </Button>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
