import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Copy, ExternalLink, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { ProductFormDialog, type Product } from "@/components/dashboard/ProductFormDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useSignedUrls } from "@/hooks/use-signed-urls";
import { formatDZD, friendlyError } from "@/lib/commerce";
import { useTr, useUiLanguage } from "@/lib/ui-i18n";

export const Route = createFileRoute("/_authenticated/dashboard/products")({
  validateSearch: z.object({ new: z.boolean().optional() }),
  component: ProductsPage,
});

function ProductsPage() {
  const { store, readOnly } = useMyStore();
  const t = useTr();
  const language = useUiLanguage();
  const { user } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  useEffect(() => {
    if (search.new) {
      if (readOnly) toast.error(t("حسابك في وضع القراءة فقط. جدّد اشتراكك لإضافة منتجات."));
      else {
        setEditing(null);
        setOpen(true);
      }
      navigate({ to: "/dashboard/products", search: {}, replace: true });
    }
  }, [search.new, readOnly, navigate]);

  const products = useQuery({
    queryKey: ["products", store?.id],
    enabled: !!store,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const urls = useSignedUrls((products.data ?? []).map((p) => p.images[0]));

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("تم حذف المنتج"));
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(t(friendlyError(e.message))),
  });

  const landingUrl = (p: Product) => `${window.location.origin}/m/${store?.slug}/p/${p.slug}`;

  return (
    <>
      <PageHeader
        title={t("المنتجات")}
        description={t("لكل منتج صفحة هبوط سريعة جاهزة لإعلانات تيك توك وإنستغرام.")}
        actions={
          <Button
            variant="brand"
            disabled={readOnly}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus /> {t("منتج جديد")}
          </Button>
        }
      />

      {products.data?.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed bg-card p-12 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Package className="size-7" />
          </div>
          <h2 className="mt-4 text-lg font-medium">{t("أضف منتجك الأول")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("ستحصل فوراً على صفحة هبوط بنموذج طلب الدفع عند الاستلام.")}</p>
          <Button className="mt-5" variant="brand" disabled={readOnly} onClick={() => setOpen(true)}>
            <Plus /> {t("منتج جديد")}
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.data?.map((p) => (
          <div key={p.id} className="overflow-hidden rounded-2xl bg-card shadow-card">
            <div className="relative aspect-[4/3] bg-muted">
              {p.images[0] && urls[p.images[0]] ? (
                <img src={urls[p.images[0]]} alt={p.name} className="size-full object-cover" loading="lazy" />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <Package className="size-10" />
                </div>
              )}
              <div className="absolute start-3 top-3 flex gap-1.5">
                {p.is_active ? <Badge variant="success">{t("معروض")}</Badge> : <Badge variant="neutral">{t("مخفي")}</Badge>}
                {p.stock === 0 && <Badge variant="danger">{t("نفدت الكمية")}</Badge>}
              </div>
            </div>
            <div className="p-4">
              <p className="truncate font-medium">{p.name}</p>
              {(p.category || p.stock != null) && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {p.category}
                  {p.category && p.stock != null && " · "}
                  {p.stock != null && (
                    <>
                      {t("المتوفر: {n}", { n: p.stock })}
                    </>
                  )}
                </p>
              )}
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-lg font-medium text-brand num">{formatDZD(p.price)}</span>
                {p.compare_at_price ? (
                  <span className="text-sm text-muted-foreground line-through num">{formatDZD(p.compare_at_price)}</span>
                ) : null}
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(landingUrl(p));
                    toast.success(t("تم نسخ رابط صفحة الهبوط"));
                  }}
                >
                  <Copy /> {t("نسخ الرابط")}
                </Button>
                <Button size="icon" variant="outline" className="size-8" asChild>
                  <a href={`/m/${store?.slug}/p/${p.slug}`} target="_blank" rel="noreferrer" aria-label={t("فتح الصفحة")}>
                    <ExternalLink />
                  </a>
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8"
                  disabled={readOnly}
                  aria-label={t("تعديل")}
                  onClick={() => {
                    setEditing(p);
                    setOpen(true);
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8 text-danger"
                  disabled={readOnly}
                  aria-label={t("حذف")}
                  onClick={() => setToDelete(p)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {store && (
        <ProductFormDialog open={open} onOpenChange={setOpen} product={editing} storeId={store.id} ownerId={user.id} />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent dir={language === "ar" ? "rtl" : "ltr"}>
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle>{t("حذف «{name}»؟", { name: toDelete?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("ستتوقف صفحة الهبوط الخاصة به. الطلبات السابقة تبقى محفوظة.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t("إلغاء")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => toDelete && remove.mutate(toDelete.id)}
            >
              {t("حذف")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
