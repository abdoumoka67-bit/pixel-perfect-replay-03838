import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  Printer,
  Search,
  Send,
  Trash2,
  PhoneCall,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { PaymentBadge, StatusBadge } from "@/components/dashboard/StatusBadge";
import { OrderDetailsSheet, confirmMessage, useOrderActions, type Order } from "@/components/dashboard/OrderDetailsSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMyStore } from "@/hooks/use-my-store";
import { ShippingLabelModal } from "@/components/dashboard/ShippingLabelModal";
import {
  ORDER_STATUSES,
  STATUS_LABELS,
  evaluateCustomerTrust,
  formatDZD,
  friendlyError,
  normalizeDzPhone,
  whatsappLink,
  type CustomerTrust,
  type OrderStatus,
} from "@/lib/commerce";
import { downloadText, ordersToCsv } from "@/lib/csv";
import { useTr, useUiLanguage } from "@/lib/ui-i18n";
import { cn } from "@/lib/utils";
import { TrustRadarBadge } from "@/components/dashboard/TrustRadarBadge";

export const Route = createFileRoute("/_authenticated/dashboard/orders")({
  component: OrdersPage,
});

const PAGE_SIZE = 10;

function OrdersPage() {
  const t = useTr();
  const language = useUiLanguage();
  const { store, readOnly, canManage, isPro } = useMyStore();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Order | null>(null);
  const [labelOrders, setLabelOrders] = useState<Order[] | null>(null);
  const { updateStatus, remove, sendYalidine } = useOrderActions();

  const canAssign = canManage && isPro;
  const members = useQuery({
    queryKey: ["team", store?.id],
    enabled: !!store && canAssign,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_members")
        .select("id,email,role,created_at")
        .eq("store_id", store!.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const memberEmail = (id: string | null) => (id ? members.data?.find((m) => m.id === id)?.email ?? null : null);
  const assign = useMutation({
    mutationFn: async ({ orderId, memberId }: { orderId: string; memberId: string | null }) => {
      // the SQL function accepts null to clear the assignment
      const { error } = await supabase.rpc("assign_order", { _order_id: orderId, _member_id: (memberId as unknown as string) });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("تم إسناد الطلب"));
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(t(friendlyError(e.message))),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [qInput]);

  const buildQuery = (sel = "*", count = false) => {
    let query = supabase
      .from("orders")
      .select(sel, count ? { count: "exact" } : undefined)
      .eq("store_id", store!.id)
      .order("created_at", { ascending: false });
    if (status !== "all") query = query.eq("status", status);
    if (q) {
      const safe = q.replace(/[%,()]/g, "");
      query = query.or(`phone.ilike.%${safe}%,customer_name.ilike.%${safe}%`);
    }
    return query;
  };

  const orders = useQuery({
    queryKey: ["orders", store?.id, page, q, status],
    enabled: !!store,
    placeholderData: keepPreviousData,
    // Poll while the page is visible so new orders arrive on their own.
    refetchInterval: 20_000,
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const { data, count, error } = await buildQuery("*", true).range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as Order[], count: count ?? 0 };
    },
  });

  const rows = useMemo(() => orders.data?.rows ?? [], [orders.data?.rows]);
  const total = orders.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const openOrder = useMemo(() => rows.find((r) => r.id === openId) ?? null, [rows, openId]);

  // Trust radar: minimal order history per phone, evaluated in pure commerce.ts.
  const history = useQuery({
    queryKey: ["customer-phone-history", store?.id],
    enabled: !!store,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("phone,status,created_at")
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as Array<{ phone: string; status: string; created_at: string }>;
    },
  });

  const trustByPhone = useMemo(() => {
    const map = new Map<string, CustomerTrust>();
    if (!history.data) return map;
    const inputs = history.data.map((o) => ({ customer_phone: o.phone, status: o.status, created_at: o.created_at }));
    for (const r of rows) {
      const key = normalizeDzPhone(r.phone);
      if (!key || map.has(key)) continue;
      map.set(key, evaluateCustomerTrust(inputs, r.phone));
    }
    return map;
  }, [rows, history.data]);
  const trustOf = (o: Order) => trustByPhone.get(normalizeDzPhone(o.phone)) ?? null;

  async function exportCsv() {
    let list: Order[];
    if (selected.size) {
      const { data, error } = await supabase.from("orders").select("*").in("id", Array.from(selected));
      if (error) { toast.error(t("تعذر التصدير")); return; }
      list = data;
    } else {
      const { data, error } = await buildQuery("*").limit(5000);
      if (error) { toast.error(t("تعذر التصدير")); return; }
      list = (data ?? []) as unknown as Order[];
    }
    downloadText(ordersToCsv(list, language), `oranix-orders-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(t("تم تصدير {n} طلب", { n: list.length }));
  }

  async function printLabelsForSelected() {
    const { data, error } = await supabase.from("orders").select("*").in("id", Array.from(selected));
    if (error || !data?.length) { toast.error(t("تعذر تجهيز البوليصات")); return; }
    setLabelOrders(data as unknown as Order[]);
  }

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allOnPage) rows.forEach((r) => next.delete(r.id));
    else rows.forEach((r) => next.add(r.id));
    setSelected(next);
  };
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const ActionsMenu = ({ o }: { o: Order }) => (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("إجراءات")}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => setOpenId(o.id)}>
          <Eye /> {t("التفاصيل وسجل الاتصال")}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={readOnly}>{t("تعديل الحالة")}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={o.status} onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v as OrderStatus })}>
              {ORDER_STATUSES.map((s) => (
                <DropdownMenuRadioItem key={s} value={s}>
                  {t(STATUS_LABELS[s])}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {canAssign && (members.data?.length ?? 0) > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={readOnly}>
              <UserCheck className="size-4" /> {t("إسناد إلى")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={o.assigned_member_id ?? "none"}
                onValueChange={(v) => assign.mutate({ orderId: o.id, memberId: v === "none" ? null : v })}
              >
                <DropdownMenuRadioItem value="none">{t("بدون إسناد")}</DropdownMenuRadioItem>
                {members.data?.map((m) => (
                  <DropdownMenuRadioItem key={m.id} value={m.id}>
                    <span dir="ltr" className="truncate">{m.email}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuItem asChild>
          <a href={`tel:${o.phone}`}>
            <Phone /> {t("اتصال بالزبون")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={whatsappLink(o.phone, confirmMessage(o, store?.name ?? ""))} target="_blank" rel="noreferrer">
            <MessageCircle /> {t("محادثة واتساب")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLabelOrders([o])}>
          <Printer /> {t("طباعة بوليصة A6")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={readOnly || !!o.tracking_number} onClick={() => sendYalidine.mutate(o.id)}>
          <Send /> {t("إرسال إلى Yalidine")}
        </DropdownMenuItem>
        {canManage && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={readOnly} className="text-danger focus:text-danger" onClick={() => setToDelete(o)}>
              <Trash2 /> {t("حذف الطلب")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <PageHeader
        title={t("إدارة الطلبات")}
        description={`${t("{n} طلب", { n: total })}${status !== "all" ? ` · ${t(STATUS_LABELS[status])}` : ""}`}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download /> {selected.size ? t("تصدير المحدد ({n})", { n: selected.size }) : t("تصدير Excel")}
            </Button>
            {selected.size > 0 && (
              <Button variant="outline" onClick={() => printLabelsForSelected()}>
                <Printer /> {t("طباعة بوليصة A6 ({n})", { n: selected.size })}
              </Button>
            )}
            <Button asChild variant="brand" className="hidden md:inline-flex">
              <Link to="/dashboard/products" search={{ new: true }}>
                <Plus /> {t("منتج جديد")}
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={t("ابحث برقم الهاتف أو اسم الزبون...")}
            className="h-11 bg-card ps-10"
          />
        </div>
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-11">
              <Filter /> <span className="hidden sm:inline">{status === "all" ? t("تصفية") : t(STATUS_LABELS[status])}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("حالة الطلب")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={status}
              onValueChange={(v) => {
                setStatus(v as OrderStatus | "all");
                setPage(1);
              }}
            >
              <DropdownMenuRadioItem value="all">{t("الكل")}</DropdownMenuRadioItem>
              {ORDER_STATUSES.map((s) => (
                <DropdownMenuRadioItem key={s} value={s}>
                  {t(STATUS_LABELS[s])}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl bg-card shadow-card md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-table-header text-xs text-muted-foreground">
                <th className="w-10 p-4">
                  <Checkbox checked={allOnPage} onCheckedChange={toggleAll} aria-label={t("تحديد الكل")} />
                </th>
                <th className="p-4 text-start font-medium">#</th>
                <th className="p-4 text-start font-medium">{t("رقم الطلب")}</th>
                <th className="p-4 text-start font-medium">{t("التاريخ")}</th>
                <th className="p-4 text-start font-medium">{t("المنتجات")}</th>
                <th className="p-4 text-start font-medium">{t("السعر الإجمالي")}</th>
                <th className="p-4 text-start font-medium">{t("حالة الدفع")}</th>
                <th className="p-4 text-start font-medium">{t("العنوان والولاية")}</th>
                <th className="p-4 text-start font-medium">{t("حالة الطلب")}</th>
                <th className="w-12 p-4" />
              </tr>
            </thead>
            <tbody>
              {rows.map((o, i) => (
                <tr
                  key={o.id}
                  className={cn("border-b last:border-0 transition-colors hover:bg-muted/40", selected.has(o.id) && "bg-brand-soft/40")}
                >
                  <td className="p-4">
                    <Checkbox checked={selected.has(o.id)} onCheckedChange={() => toggle(o.id)} aria-label={t("تحديد")} />
                  </td>
                  <td className="p-4 text-muted-foreground num">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="p-4">
                    <button className="font-medium hover:text-brand num" onClick={() => setOpenId(o.id)}>
                      ORX-{o.order_number}
                    </button>
                    <p className="text-xs text-muted-foreground">{o.customer_name}</p>
                    <TrustRadarBadge trust={trustOf(o)} className="mt-1" />
                    {memberEmail(o.assigned_member_id) && (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground" dir="ltr">
                        <UserCheck className="size-3" /> {memberEmail(o.assigned_member_id)}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-4 text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("ar-DZ", { day: "numeric", month: "short" })}
                    <p className="text-xs num">{new Date(o.created_at).toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" })}</p>
                  </td>
                  <td className="max-w-[200px] p-4">
                    <p className="truncate font-medium">{o.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("الكمية")}: <span className="num">{o.quantity}</span>
                      {o.call_attempts > 0 && (
                        <span className="ms-2 inline-flex items-center gap-1 text-brand">
                          <PhoneCall className="size-3" />
                          <span className="num">{o.call_attempts}</span>
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="whitespace-nowrap p-4 font-medium num">{formatDZD(o.total, language)}</td>
                  <td className="p-4">
                    <PaymentBadge status={o.payment_status} />
                  </td>
                  <td className="max-w-[200px] p-4">
                    <p className="truncate">{o.commune}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="num">{o.wilaya_code}</span> - {o.wilaya_name} · {o.delivery_type === "home" ? t("منزل") : t("مكتب")}
                    </p>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="p-4">
                    <ActionsMenu o={o} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && !orders.isLoading && <EmptyState />}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((o) => (
          <div key={o.id} className="rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <button className="min-w-0 text-start" onClick={() => setOpenId(o.id)}>
                <p className="truncate font-medium">{o.customer_name}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="num">ORX-{o.order_number}</span> · {new Date(o.created_at).toLocaleDateString("ar-DZ")}
                </p>
                <TrustRadarBadge trust={trustOf(o)} className="mt-1" />
              </button>
              <div className="flex items-center gap-1">
                <StatusBadge status={o.status} />
                <ActionsMenu o={o} />
              </div>
            </div>
            <button className="mt-3 block w-full text-start" onClick={() => setOpenId(o.id)}>
              <p className="truncate text-sm">
                {o.product_name} × <span className="num">{o.quantity}</span>
              </p>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {o.commune}، {o.wilaya_name}
                </span>
                <span className="font-medium num">{formatDZD(o.total, language)}</span>
              </div>
            </button>
            {memberEmail(o.assigned_member_id) && (
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <UserCheck className="size-3" /> <span dir="ltr">{memberEmail(o.assigned_member_id)}</span>
              </p>
            )}
            {o.call_attempts > 0 && (
              <p className="mt-2 text-xs text-brand">
                <span className="num">{o.call_attempts}</span> {t("محاولات اتصال")}
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button asChild size="sm" variant="default">
                <a href={`tel:${o.phone}`}>
                  <Phone /> {t("اتصال")}
                </a>
              </Button>
              <Button asChild size="sm" variant="success">
                <a href={whatsappLink(o.phone, confirmMessage(o, store?.name ?? ""))} target="_blank" rel="noreferrer">
                  <MessageCircle /> {t("واتساب")}
                </a>
              </Button>
            </div>
          </div>
        ))}
        {rows.length === 0 && !orders.isLoading && (
          <div className="rounded-2xl bg-card shadow-card">
            <EmptyState />
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {t("عرض")} <span className="num">{(page - 1) * PAGE_SIZE + 1}</span>–<span className="num">{Math.min(page * PAGE_SIZE, total)}</span>{" "}
            {t("من")} <span className="num">{total}</span>
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronRight /> {t("السابق")}
            </Button>
            {pageNumbers(page, pages).map((n, idx) =>
              n === -1 ? (
                <span key={`gap-${idx}`} className="px-1 text-muted-foreground">…</span>
              ) : (
                <Button key={n} size="sm" variant={n === page ? "default" : "ghost"} className="w-8 num" onClick={() => setPage(n)}>
                  {n}
                </Button>
              ),
            )}
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              {t("التالي")} <ChevronLeft />
            </Button>
          </div>
        </div>
      )}

      <OrderDetailsSheet
        order={openOrder}
        storeName={store?.name ?? ""}
        readOnly={readOnly}
        trust={openOrder ? trustOf(openOrder) : null}
        onOpenChange={(o) => !o && setOpenId(null)}
      />

      <ShippingLabelModal
        open={!!labelOrders}
        onOpenChange={(o) => !o && setLabelOrders(null)}
        orders={labelOrders ?? []}
        storeName={store?.name ?? ""}
        storePhone={store?.whatsapp ?? store?.phone ?? ""}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle>{t("حذف الطلب ORX-{n}؟", { n: toDelete?.order_number ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("لا يمكن التراجع عن هذا الإجراء.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t("إلغاء")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => toDelete && remove.mutate(toDelete.id)}
            >
              {t("حذف نهائي")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EmptyState() {
  const t = useTr();
  return (
    <div className="p-10 text-center">
      <p className="font-medium">{t("لا توجد طلبات")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("ستظهر هنا طلبات الزبائن من صفحات الهبوط فور وصولها.")}</p>
    </div>
  );
}

function pageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current, current - 1, current + 1]);
  const list = Array.from(set).filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: number[] = [];
  list.forEach((n, i) => {
    if (i > 0 && n - (list[i - 1] ?? n) > 1) out.push(-1);
    out.push(n);
  });
  return out;
}
