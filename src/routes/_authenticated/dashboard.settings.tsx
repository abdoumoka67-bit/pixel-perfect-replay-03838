import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { verifyCustomDomain } from "@/lib/domain.functions";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Globe, ImagePlus, Languages, Loader2, Save, Target } from "lucide-react";
import { LanguageSwitcher, useLanguagePreference, useT } from "@/components/LanguageSwitcher";
import { translate } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { ProLock, ProPill } from "@/components/dashboard/ProLock";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StorefrontThemeSettings } from "@/components/dashboard/StorefrontThemeSettings";
import { WILAYAS } from "@/data/wilayas";
import { useMyStore } from "@/hooks/use-my-store";
import { useSignedUrls } from "@/hooks/use-signed-urls";
import { PRODUCT_BUCKET, fileExt } from "@/lib/images";
import { Badge } from "@/components/ui/badge";
import {
  cleanDomainName,
  cleanMetaPixelId,
  cleanTiktokPixelId,
  CUSTOM_DOMAIN_CNAME_TARGET,
  friendlyError,
  isValidDomainName,
  isValidMetaPixelId,
  isValidStoreSlug,
  isValidTiktokPixelId,
} from "@/lib/commerce";
import { RestartTourButton } from "@/components/dashboard/GuidedTour";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { store, readOnly, isPro } = useMyStore();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [origin, setOrigin] = useState("16");
  const [logo, setLogo] = useState<string | null>(null);
  const [metaPixel, setMetaPixel] = useState("");
  const [tiktokPixel, setTiktokPixel] = useState("");
  const urls = useSignedUrls([logo]);

  useEffect(() => {
    if (!store) return;
    setName(store.name);
    setSlug(store.slug);
    setPhone(store.phone ?? "");
    setWhatsapp(store.whatsapp ?? "");
    setOrigin(String(store.origin_wilaya_code));
    setLogo(store.logo_url);
    setMetaPixel(store.meta_pixel_id ?? "");
    setTiktokPixel(store.tiktok_pixel_id ?? "");
  }, [store]);

  const savePixels = useMutation({
    mutationFn: async () => {
      if (!isValidMetaPixelId(metaPixel)) throw new Error("INVALID_META_PIXEL");
      if (!isValidTiktokPixelId(tiktokPixel)) throw new Error("INVALID_TIKTOK_PIXEL");
      const { error } = await supabase.rpc("set_store_pixels", {
        _store_id: store!.id,
        _meta: cleanMetaPixelId(metaPixel),
        _tiktok: cleanTiktokPixelId(tiktokPixel),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ البيكسل");
      qc.invalidateQueries({ queryKey: ["my-store"] });
    },
    onError: (e: Error) => toast.error(friendlyError(e.message, "تعذر الحفظ")),
  });

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
    <div className="space-y-10">
      <PageHeader title="إعدادات المتجر" description="هوية متجرك، معلومات التواصل، ومظهر صفحة الهبوط." actions={<RestartTourButton />} />
      <form
        className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
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
        <div className="space-y-6">
          <div className="h-fit rounded-2xl bg-sidebar p-6 text-sidebar-foreground shadow-card">
            <h2 className="font-medium">رابط متجرك</h2>
            <p className="mt-1 text-sm text-sidebar-muted">شاركه في البايو على إنستغرام وتيك توك.</p>
            <div className="mt-4 flex min-w-0 items-center gap-2 rounded-xl bg-sidebar-accent px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-sm" dir="ltr">{storeUrl}</span>
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
          <PixelCard
            isPro={isPro}
            disabled={readOnly}
            meta={metaPixel}
            tiktok={tiktokPixel}
            onMeta={setMetaPixel}
            onTiktok={setTiktokPixel}
            saving={savePixels.isPending}
            onSave={() => savePixels.mutate()}
          />
        </div>
      </form>

      <LanguageCard />

      <div className="border-t border-border pt-8">
        <StorefrontThemeSettings store={store} readOnly={readOnly} />
      </div>

      <div className="border-t border-border pt-8">
      {store ? (
        <CustomDomainSection store={store} readOnly={readOnly} isPro={isPro} />
      ) : null}
      </div>
    </div>
  );
}

function LanguageCard() {
  const { language, setLanguage } = useLanguagePreference();
  const { t } = useT();
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Languages className="size-5" strokeWidth={1.6} />
        </span>
        <div className="min-w-0">
          <h2 className="font-medium">{t("lang.title")}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("lang.description")}</p>
        </div>
      </div>
      <LanguageSwitcher
        value={language}
        onChange={(l) => {
          setLanguage(l);
          toast.success(translate(l, "lang.saved"));
        }}
        className="self-start sm:self-auto"
      />
    </div>
  );
}

function PixelCard(props: {
  isPro: boolean;
  disabled: boolean;
  meta: string;
  tiktok: string;
  onMeta: (v: string) => void;
  onTiktok: (v: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const locked = !props.isPro;
  return (
    <div className="space-y-4 rounded-2xl bg-card p-6 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Target className="size-5" strokeWidth={1.6} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-medium">البيكسل (تتبع الإعلانات)</h2>
            {locked && <ProPill />}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            نسجل تلقائياً: مشاهدة الصفحة، مشاهدة المنتج، بدء ملء الفورم، وإتمام الطلب.
          </p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="meta-pixel">Meta Pixel ID (فيسبوك وإنستغرام)</Label>
        <Input
          id="meta-pixel"
          dir="ltr"
          inputMode="numeric"
          placeholder="123456789012345"
          value={props.meta}
          disabled={locked}
          onChange={(e) => props.onMeta(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tt-pixel">TikTok Pixel ID</Label>
        <Input
          id="tt-pixel"
          dir="ltr"
          placeholder="C1A2B3C4D5E6F7G8H9"
          value={props.tiktok}
          disabled={locked}
          onChange={(e) => props.onTiktok(e.target.value)}
        />
      </div>
      {locked ? (
        <Button asChild variant="outline" className="w-full">
          <Link to="/dashboard/billing">الترقية إلى Pro لتفعيل البيكسل</Link>
        </Button>
      ) : (
        <Button type="button" className="w-full" disabled={props.saving || props.disabled} onClick={props.onSave}>
          {props.saving ? <Loader2 className="animate-spin" /> : <Save />} حفظ البيكسل
        </Button>
      )}
    </div>
  );
}

type CustomDomainConfig = { domain?: string; status?: "pending" | "active" };

function readCustomDomain(config: unknown): CustomDomainConfig {
  if (!config || typeof config !== "object") return {};
  const cd = (config as Record<string, unknown>)["custom_domain"];
  return typeof cd === "object" && cd !== null ? (cd as CustomDomainConfig) : {};
}

function CustomDomainSection({
  store,
  readOnly,
  isPro,
}: {
  store: NonNullable<ReturnType<typeof useMyStore>["store"]>;
  readOnly: boolean;
  isPro: boolean;
}) {
  const qc = useQueryClient();
  const saved = useMemo(() => readCustomDomain(store.storefront_config), [store.storefront_config]);
  const [domain, setDomain] = useState(saved.domain ?? "");
  const domainClean = cleanDomainName(domain);
  const domainValid = isValidDomainName(domainClean);

  const saveDomain = useMutation({
    mutationFn: async () => {
      const base = (store.storefront_config && typeof store.storefront_config === "object"
        ? (store.storefront_config as Record<string, unknown>)
        : {}) as Record<string, unknown>;
      const next = { domain: domainClean, status: "pending" as const };
      const { error } = await supabase
        .from("stores")
        .update({ storefront_config: { ...base, custom_domain: next } })
        .eq("id", store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تسجيل الدومين. تابع تعليمات DNS ثم تنتقل الحالة إلى نشط بعد التحقق.");
      qc.invalidateQueries({ queryKey: ["my-store"] });
    },
    onError: (e: Error) => toast.error(friendlyError(e.message, "تعذر الحفظ")),
  });

  const verifyFn = useServerFn(verifyCustomDomain);
  const verify = useMutation({
    mutationFn: () => verifyFn({ data: { storeId: store.id } }),
    onSuccess: (r) => {
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
      qc.invalidateQueries({ queryKey: ["my-store"] });
    },
    onError: () => toast.error("تعذر التحقق حالياً"),
  });

  if (!isPro) {
    return (
      <div>
        <h2 className="mb-4 font-medium">الدومين المخصص (Custom Domain)</h2>
        <ProLock
          title="الدومين المخصص حصري لباقة Pro"
          description="اربط متجرك بدومينك الخاص مثل storename.com مباشرة بدل الرابط الفرعي — متاح لمشتركي باقة Pro."
          points={[
            "دومينك الخاص بالكامل: storename.com",
            "شهادة SSL تلقائية عند التحقق",
            "توجيه DNS عبر CNAME في دقيقتين",
          ]}
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card p-6 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Globe className="size-5" strokeWidth={1.6} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium">الدومين المخصص (Custom Domain)</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            اربط متجرك بدومينك الخاص. أضف سجل CNAME لدى مزوّد الدومين ثم انتظر التحقق.
          </p>
        </div>
        {saved.domain && (
          <div className="flex flex-col items-end gap-2">
            <Badge variant={saved.status === "active" ? "success" : "warning"}>
              {saved.status === "active" ? "نشط (Active)" : "قيد التحقق (Pending)"}
            </Badge>
            {saved.status !== "active" && (
              <Button size="sm" variant="outline" disabled={verify.isPending} onClick={() => verify.mutate()}>
                {verify.isPending ? <Loader2 className="animate-spin" /> : null} تحقق الآن
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 space-y-1.5">
        <Label htmlFor="custom-domain">دومينك (مثال: storename.com)</Label>
        <Input
          id="custom-domain"
          dir="ltr"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="storename.com"
          aria-invalid={Boolean(domain) && !domainValid}
        />
        {domain && !domainValid && (
          <p className="text-xs text-destructive">دومين غير صالح: مثال صحيح storename.com (بدون https أو مسارات).</p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-background p-4 text-sm leading-7">
        <p className="font-medium">تعليمات DNS</p>
        <p>1. افتح لوحة مزوّد الدومين لديك (مثال: Namecheap أو OVH).</p>
        <p>
          2. أضف سجل <b>CNAME</b> بالقيم التالية:
          <span dir="ltr" className="num">Type: CNAME · Host: @ / www · Value: {CUSTOM_DOMAIN_CNAME_TARGET}</span>
        </p>
        <p>3. انتظر انتشار سجل DNS (من دقائق إلى 24 ساعة) ثم تتحول الحالة إلى نشط (Active).</p>
      </div>

      <Button
        variant="brand"
        className="mt-5"
        disabled={readOnly || !domainValid || saveDomain.isPending}
        onClick={() => saveDomain.mutate()}
      >
        {saveDomain.isPending ? <Loader2 className="animate-spin" /> : <Save />} حفظ الدومين
      </Button>
    </div>
  );
}
