import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useSignedUrls } from "@/hooks/use-signed-urls";
import { PRODUCT_BUCKET, fileExt } from "@/lib/images";
import { friendlyError, slugify } from "@/lib/commerce";
import { useTr, useUiLanguage } from "@/lib/ui-i18n";
import type { Tables } from "@/integrations/supabase/types";

export type Product = Tables<"products">;

const splitList = (s: string) =>
  s
    .split(/[,،\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  storeId,
  ownerId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product: Product | null;
  storeId: string;
  ownerId: string;
}) {
  const qc = useQueryClient();
  const t = useTr();
  const language = useUiLanguage();
  const listSep = language === "ar" ? "، " : ", ";
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [compare, setCompare] = useState("");
  const [features, setFeatures] = useState("");
  const [sizes, setSizes] = useState("");
  const [colors, setColors] = useState("");
  const [active, setActive] = useState(true);
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const urls = useSignedUrls(images);

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? "");
    setSlug(product?.slug ?? "");
    setDescription(product?.description ?? "");
    setPrice(product ? String(product.price) : "");
    setCompare(product?.compare_at_price ? String(product.compare_at_price) : "");
    setFeatures(product?.features.join("\n") ?? "");
    setSizes(product?.sizes.join(listSep) ?? "");
    setColors(product?.colors.join(listSep) ?? "");
    setActive(product?.is_active ?? true);
    setStock(product?.stock != null ? String(product.stock) : "");
    setCategory(product?.category ?? "");
    setImages(product?.images ?? []);
  }, [open, product]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const added: string[] = [];
    for (const file of Array.from(files).slice(0, 8)) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("{file}: الحجم الأقصى 5MB", { file: file.name }));
        continue;
      }
      const path = `${ownerId}/${crypto.randomUUID()}.${fileExt(file)}`;
      const { error } = await supabase.storage.from(PRODUCT_BUCKET).upload(path, file, { contentType: file.type });
      if (error) toast.error(t("تعذر رفع الصورة"));
      else added.push(path);
    }
    setImages((prev) => [...prev, ...added]);
    setUploading(false);
  }

  const save = useMutation({
    mutationFn: async () => {
      const finalSlug = slug.trim() || slugify(name) || `p-${Math.random().toString(36).slice(2, 8)}`;
      const payload = {
        store_id: storeId,
        name: name.trim(),
        slug: finalSlug,
        description: description.trim(),
        price: Number(price),
        compare_at_price: compare ? Number(compare) : null,
        features: features.split("\n").map((x) => x.trim()).filter(Boolean),
        sizes: splitList(sizes),
        colors: splitList(colors),
        is_active: active,
        images,
        stock: stock.trim() === "" ? null : Number(stock),
        category: category.trim() || null,
      };
      if (payload.stock !== null && (!Number.isInteger(payload.stock) || payload.stock < 0)) throw new Error(t("الكمية غير صحيحة"));
      if (!payload.name) throw new Error(t("اسم المنتج مطلوب"));
      if (!Number.isFinite(payload.price) || payload.price <= 0) throw new Error(t("السعر غير صحيح"));
      const { error } = product
        ? await supabase.from("products").update(payload).eq("id", product.id)
        : await supabase.from("products").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(product ? t("تم حفظ التعديلات") : t("تمت إضافة المنتج"));
      qc.invalidateQueries({ queryKey: ["products"] });
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast.error(e.message.length < 40 && !/[a-z_]{6,}/i.test(e.message) ? e.message : t(friendlyError(e.message))),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={language === "ar" ? "rtl" : "ltr"} className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="text-start">
          <DialogTitle>{product ? t("تعديل المنتج") : t("منتج جديد")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label>{t("الصور")}</Label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {images.map((p, i) => (
                <div key={p} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
                  {urls[p] && <img src={urls[p]} alt="" className="size-full object-cover" />}
                  {i === 0 && (
                    <span className="absolute bottom-1 start-1 rounded bg-primary/80 px-1.5 text-[10px] text-primary-foreground">{t("رئيسية")}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((x) => x !== p))}
                    className="absolute end-1 top-1 rounded-full bg-card/90 p-1 shadow"
                    aria-label={t("حذف الصورة")}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-xs text-muted-foreground hover:border-brand hover:text-brand"
              >
                {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                {t("إضافة")}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pname">{t("اسم المنتج")}</Label>
              <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">{t("السعر (د.ج)")}</Label>
              <Input id="price" type="number" min={1} dir="ltr" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="compare">{t("السعر قبل التخفيض (اختياري)")}</Label>
              <Input id="compare" type="number" min={0} dir="ltr" value={compare} onChange={(e) => setCompare(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock">{t("الكمية المتوفرة (اختياري)")}</Label>
              <Input id="stock" type="number" min={0} step={1} dir="ltr" value={stock} onChange={(e) => setStock(e.target.value)} placeholder={t("بدون حد")} />
              <p className="text-xs text-muted-foreground">{t("تنقص تلقائياً مع كل طلب، وتعود عند الإلغاء.")}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">{t("التصنيف (اختياري)")}</Label>
              <Input id="category" maxLength={40} value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("ملابس، إكسسوارات...")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pslug">{t("رابط الصفحة")}</Label>
              <Input
                id="pslug"
                dir="ltr"
                placeholder={slugify(name) || "my-product"}
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              />
              <p className="text-xs text-muted-foreground">{t("حروف لاتينية وأرقام وشرطات. يُولّد تلقائياً إن تركته فارغاً.")}</p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="desc">{t("الوصف")}</Label>
              <Textarea id="desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="feat">{t("أهم المميزات (ميزة في كل سطر)")}</Label>
              <Textarea id="feat" rows={3} value={features} onChange={(e) => setFeatures(e.target.value)} placeholder={t("قماش قطني 100%\nضمان الاستبدال")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sizes">{t("المقاسات (افصل بفاصلة)")}</Label>
              <Input id="sizes" value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder={language === "ar" ? "S، M، L، XL" : "S, M, L, XL"} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="colors">{t("الألوان (افصل بفاصلة)")}</Label>
              <Input id="colors" value={colors} onChange={(e) => setColors(e.target.value)} placeholder={t("أسود، أبيض")} />
            </div>
          </div>

          <label className="flex items-center justify-between rounded-xl border p-4">
            <div>
              <p className="font-medium">{t("المنتج معروض")}</p>
              <p className="text-xs text-muted-foreground">{t("عند الإيقاف تختفي صفحة الهبوط عن الزبائن.")}</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("إلغاء")}
            </Button>
            <Button type="submit" variant="brand" disabled={save.isPending || uploading}>
              {save.isPending && <Loader2 className="animate-spin" />} {t("حفظ المنتج")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
