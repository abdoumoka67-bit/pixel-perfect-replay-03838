import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, ImagePlus, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WILAYAS } from "@/data/wilayas";
import { useMyStore } from "@/hooks/use-my-store";
import { useSignedUrls } from "@/hooks/use-signed-urls";
import { PRODUCT_BUCKET, fileExt } from "@/lib/images";
import { friendlyError, isValidStoreSlug } from "@/lib/commerce";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { store, readOnly } = useMyStore();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [origin, setOrigin] = useState("16");
  const [logo, setLogo] = useState<string | null>(null);
  const urls = useSignedUrls([logo]);

  useEffect(() => {
    if (!store) return;
    setName(store.name);
    setSlug(store.slug);
    setPhone(store.phone ?? "");
    setWhatsapp(store.whatsapp ?? "");
    setOrigin(String(store.origin_wilaya_code));
    setLogo(store.logo_url);
  }, [store]);

  async function uploadLogo(f: File | undefined) {
    if (!f) return;
    const path = `${user.id}/logo-${crypto.randomUUID()}.${fileExt(f)}`;
    const { error } = await supabase.storage.from(PRODUCT_BUCKET).upload(path, f, { contentType: f.type });
    if (error) { toast.error("تعذر رفع الشعار"); return; }
    setLogo(path);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!isValidStoreSlug(slug)) throw new Error("INVALID_SLUG");
      const { error } = await supabase
        .from("stores")
        .update({
          name: name.trim(),
          slug,
          phone: phone || null,
          whatsapp: whatsapp || null,
          origin_wilaya_code: Number(origin),
          logo_url: logo,
        })
        .eq("id", store!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات");
      qc.invalidateQueries({ queryKey: ["my-store"] });
    },
    onError: (e: Error) => toast.error(friendlyError(e.message, "تعذر الحفظ")),
  });

  const storeUrl = typeof window !== "undefined" && store ? `${window.location.origin}/m/${store.slug}` : "";

  return (
    <>
      <PageHeader title="إعدادات المتجر" description="هوية متجرك ومعلومات التواصل." />
      <form
        className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-5 rounded-2xl bg-card p-6 shadow-card">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed text-muted-foreground hover:border-brand hover:text-brand"
              aria-label="رفع الشعار"
            >
              {logo && urls[logo] ? <img src={urls[logo]} alt="" className="size-full object-cover" /> : <ImagePlus className="size-6" />}
            </button>
            <div>
              <p className="font-medium">شعار المتجر</p>
              <p className="text-xs text-muted-foreground">يظهر في صفحات الهبوط. مربع، حتى 5MB.</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => uploadLogo(e.target.files?.[0])} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sname">اسم المتجر</Label>
            <Input id="sname" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sslug">رابط المتجر</Label>
            <Input id="sslug" dir="ltr" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
            <p className="text-xs text-muted-foreground">تغيير الرابط يوقف الروابط القديمة المنشورة في إعلاناتك.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sphone">رقم الهاتف</Label>
              <Input id="sphone" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="swa">رقم واتساب</Label>
              <Input id="swa" dir="ltr" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>ولاية الإرسال (لـ Yalidine)</Label>
            <Select value={origin} onValueChange={setOrigin} dir="rtl">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {WILAYAS.map((w) => (
                  <SelectItem key={w.code} value={String(w.code)}>
                    {w.code} - {w.ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" variant="brand" disabled={save.isPending || readOnly}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} حفظ الإعدادات
          </Button>
        </div>
        <div className="h-fit rounded-2xl bg-sidebar p-6 text-sidebar-foreground shadow-card">
          <h2 className="font-semibold">رابط متجرك</h2>
          <p className="mt-1 text-sm text-sidebar-muted">شاركه في البايو على إنستغرام وتيك توك.</p>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-sidebar-accent px-4 py-3">
            <span className="flex-1 truncate text-sm" dir="ltr">{storeUrl}</span>
            <button
              type="button"
              className="rounded-lg p-1.5 text-sidebar-muted hover:text-sidebar-foreground"
              onClick={() => {
                navigator.clipboard.writeText(storeUrl);
                toast.success("تم نسخ الرابط");
              }}
              aria-label="نسخ"
            >
              <Copy className="size-4" />
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
