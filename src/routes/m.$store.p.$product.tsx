import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import {
  Check,
  Loader2,
  Lock,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  Truck,
  Banknote,
  Home,
  Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getProductPage } from "@/lib/storefront.functions";
import { WILAYAS, wilayaByCode } from "@/data/wilayas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StoreChrome, StoreFaq } from "@/components/store/StoreChrome";
import {
  formatDZD,
  friendlyError,
  isValidDzPhone,
  normalizeDzPhone,
  whatsappLink,
  orderTotal,
  shippingPrice,
  ORDER_NETWORK_ERROR,
  ORDER_TECHNICAL_ERROR,
  type DeliveryType,
} from "@/lib/commerce";
import { cn } from "@/lib/utils";
import { identifyPixelCustomer, trackPixel } from "@/lib/pixels";
import { readAttribution } from "@/lib/attribution";
import { useStorefrontLanguage } from "@/components/LanguageSwitcher";
import { tr } from "@/lib/ui-i18n";

/** A submit that never answers must not leave the buyer stuck on a spinner. */
const ORDER_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(ORDER_NETWORK_ERROR)), ms);
    }),
  ]);
}

export const Route = createFileRoute("/m/$store/p/$product")({
  loader: async ({ params }) => {
    const data = await getProductPage({ data: { slug: params.store, product: params.product } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: tr("en", "المنتج غير متوفر") }, { name: "robots", content: "noindex" }],
      };
    }
    const { product, store } = loaderData;
    const lang = store.storefront_config?.language ?? "en";
    const title = `${product.name} — ${store.name}`;
    const description = (
      product.description ||
      tr(lang, "اطلب {name} الآن والدفع عند الاستلام في 58 ولاية.", { name: product.name })
    ).slice(0, 155);
    const image = product.images[0];
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-2xl font-medium">{tr("en", "المنتج غير متوفر")}</h1>
      <p className="text-muted-foreground">
        {tr("en", "ربما تم إيقاف هذا المنتج أو تغيير رابطه.")}
      </p>
    </div>
  ),
  component: ProductLanding,
});

type Communes = Record<string, [string, string][]>;

function ProductLanding() {
  const { store, product, rates } = Route.useLoaderData();
  const storeLanguage = store.storefront_config?.language ?? "en";
  const { language } = useStorefrontLanguage(storeLanguage);
  const t = (text: string, vars?: Record<string, string | number>) => tr(language, text, vars);
  const isRtl = language === "ar";
  const formConfig = store.storefront_config?.form_config;
  const formFields = formConfig?.fields;
  const showName = formFields?.full_name !== false;
  const showPhone = formFields?.phone !== false;
  const showLocation = formFields?.wilaya_commune !== false;
  const showAddress = formFields?.address !== false;
  const showDelivery = formFields?.delivery_type !== false;
  const showConfirmPhone = formFields?.confirm_phone === true;
  const showBackupPhone = formFields?.backup_phone === true;
  const showNotes = formFields?.notes === true;
  const showWhatsappOrder = formFields?.whatsapp_order ?? true;
  const whatsappTarget = (
    store.storefront_config?.sections?.social?.whatsapp ||
    store.whatsapp ||
    ""
  ).trim();
  const formButtonRadius =
    formConfig?.button_radius === "none"
      ? "0px"
      : formConfig?.button_radius === "md"
        ? "0.5rem"
        : formConfig?.button_radius === "lg"
          ? "1rem"
          : formConfig?.button_radius === "full"
            ? "9999px"
            : undefined;
  const formInputStyle = formConfig ? { borderColor: formConfig.border_color } : undefined;
  const formVars = formConfig
    ? ({ "--form-focus": formConfig.input_focus_color } as CSSProperties)
    : undefined;
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPhone, setConfirmPhone] = useState("");
  const [backupPhone, setBackupPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [wilaya, setWilaya] = useState<string>("");
  const [commune, setCommune] = useState<string>("");
  const [address, setAddress] = useState("");
  const [delivery, setDelivery] = useState<DeliveryType>("home");
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState<string>(product.sizes[0] ?? "");
  const [color, setColor] = useState<string>(product.colors[0] ?? "");
  const [communes, setCommunes] = useState<Communes | null>(null);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const submitLock = useRef(false);

  const [checkoutTracked, setCheckoutTracked] = useState(false);
  useEffect(() => {
    // after StoreChrome has loaded the pixels
    const t = setTimeout(
      () => trackPixel("ViewContent", { id: product.id, name: product.name, value: product.price }),
      0,
    );
    return () => clearTimeout(t);
  }, [product.id, product.name, product.price]);
  const onFormFocus = () => {
    if (checkoutTracked) return;
    setCheckoutTracked(true);
    trackPixel("InitiateCheckout", {
      id: product.id,
      name: product.name,
      value: product.price,
      quantity: qty,
    });
  };

  useEffect(() => {
    import("@/data/communes.json").then((m) => setCommunes(m.default as unknown as Communes));
  }, []);

  const wCode = wilaya ? Number(wilaya) : null;
  const ship = (t: DeliveryType) => (wCode ? shippingPrice(wCode, t, rates, store) : null);
  const homePrice = ship("home");
  const deskPrice = ship("desk");

  useEffect(() => {
    if (!wCode) return;
    if (delivery === "home" && homePrice == null && deskPrice != null) setDelivery("desk");
    if (delivery === "desk" && deskPrice == null && homePrice != null) setDelivery("home");
  }, [wCode, homePrice, deskPrice, delivery]);

  const currentShip = ship(delivery);
  const total = orderTotal(product.price, qty, currentShip ?? 0);
  const communeList = useMemo(
    () => (wCode && communes ? (communes[String(wCode)] ?? []) : []),
    [wCode, communes],
  );
  const phoneOk = isValidDzPhone(phone);
  const discount =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round((1 - product.price / product.compare_at_price) * 100)
      : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitLock.current) return;
    setTouched(true);
    if (showName && name.trim().length < 3) {
      toast.error(t("يرجى كتابة الاسم واللقب."));
      return;
    }
    if (showPhone && !phoneOk) {
      toast.error(t("رقم الهاتف غير صحيح. يجب أن يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام."));
      return;
    }
    if (showConfirmPhone && confirmPhone.trim() !== phone.trim()) {
      toast.error(t("رقم الهاتف غير متطابق. يرجى التأكد من كتابة نفس الرقم."));
      return;
    }
    if (showBackupPhone && backupPhone.trim() && !isValidDzPhone(backupPhone)) {
      toast.error(t("رقم الهاتف الاحتياطي غير صحيح."));
      return;
    }
    if (showLocation && !wCode) {
      toast.error(t("يرجى اختيار الولاية."));
      return;
    }
    if (showLocation && !commune) {
      toast.error(t("يرجى اختيار البلدية."));
      return;
    }
    if (currentShip == null) {
      toast.error(t("نوع التوصيل هذا غير متوفر في ولايتك."));
      return;
    }

    submitLock.current = true;
    setBusy(true);
    try {
      const extraDetails = [
        address.trim(),
        backupPhone.trim() ? `${t("هاتف احتياطي")}: ${backupPhone.trim()}` : "",
        notes.trim() ? `${t("ملاحظات")}: ${notes.trim()}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
      const args = {
        _product_id: product.id,
        _quantity: qty,
        _customer_name: name.trim() || t("عميل"),
        _phone: normalizeDzPhone(phone),
        _wilaya_code: wCode ?? 0,
        _wilaya_name: wilayaByCode(wCode ?? 0)?.ar ?? "",
        _commune: commune,
        _address: extraDetails,
        _delivery_type: delivery,
        ...(product.sizes.length ? { _size: size } : {}),
        ...(product.colors.length ? { _color: color } : {}),
        _attribution: readAttribution(),
      };
      let { data, error } = await withTimeout(supabase.rpc("place_order", args), ORDER_TIMEOUT_MS);
      if (
        error &&
        /_attribution|PGRST202|schema cache|Could not find the function/i.test(
          `${error.code} ${error.message}`,
        )
      ) {
        // Migration not applied yet: place the order without attribution instead of failing.
        const { _attribution: _unused, ...legacy } = args;
        ({ data, error } = await withTimeout(
          supabase.rpc("place_order", legacy),
          ORDER_TIMEOUT_MS,
        ));
      }
      if (error) {
        if (error.message.includes("DUPLICATE_ORDER")) {
          // The previous tap / retry already created it: the merchant has the order.
          navigate({
            to: "/m/$store/thank-you",
            params: { store: store.slug },
            search: { n: 0, t: total, p: product.name, pid: product.id, l: language },
          });
          return;
        }
        toast.error(t(friendlyError(error.message)));
        return;
      }
      const row = data?.[0];
      if (!row) {
        toast.error(t(ORDER_TECHNICAL_ERROR));
        return;
      }
      // Advanced matching: send hashed buyer data so Meta/TikTok can match the order
      // to the ad click. Never let a slow pixel call block the confirmation page.
      await Promise.race([
        identifyPixelCustomer({ phone: normalizeDzPhone(phone), name }).catch(() => undefined),
        new Promise<void>((resolve) => setTimeout(resolve, 1500)),
      ]);
      navigate({
        to: "/m/$store/thank-you",
        params: { store: store.slug },
        search: {
          n: Number(row.order_number ?? 0),
          t: Number(row.total ?? total),
          p: product.name,
          pid: product.id,
          l: language,
        },
      });
    } catch (err) {
      toast.error(t(friendlyError(err instanceof Error ? err.message : ORDER_NETWORK_ERROR)));
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }

  return (
    <StoreChrome store={store}>
      <div className="pb-28 lg:pb-16">
        <div className="mx-auto grid max-w-5xl items-start gap-8 px-4 py-6 lg:grid-cols-12 lg:gap-10 lg:py-10">
          {/* Gallery (Left: 5 cols on desktop, capped width & height) */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 lg:self-start w-full max-w-[440px] mx-auto">
            <div className="relative aspect-[4/5] sm:aspect-square max-h-[460px] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
              {product.images[active] ? (
                <img
                  src={product.images[active]}
                  alt={product.name}
                  className="size-full object-cover object-center"
                  fetchPriority="high"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-muted/40 text-sm text-muted-foreground">
                  {t("لا توجد صورة")}
                </div>
              )}
              {discount > 0 && (
                <span className="absolute start-3.5 top-3.5 rounded-full bg-[#111111] px-2.5 py-0.5 text-xs font-medium text-white shadow-xs">
                  -{discount}%
                </span>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {product.images.map((src, i) => (
                  <button
                    key={src}
                    onClick={() => setActive(i)}
                    className={cn(
                      "size-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                      i === active
                        ? "scale-105 border-[#111111] shadow-2xs"
                        : "border-transparent opacity-60 hover:opacity-100",
                    )}
                    aria-label={t("صورة {n}", { n: i + 1 })}
                  >
                    <img src={src} alt="" className="size-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info + Order Form (Right: 7 cols on desktop) */}
          <div className="lg:col-span-7 max-w-xl space-y-4">
            <h1 className="text-xl font-medium leading-snug text-foreground sm:text-2xl">
              {product.name}
            </h1>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="text-2xl font-medium text-foreground num">
                {formatDZD(product.price, language)}
              </span>
              {discount > 0 && (
                <span className="text-sm text-muted-foreground line-through num">
                  {formatDZD(product.compare_at_price!, language)}
                </span>
              )}
            </div>

            {/* Compact Trust Badges */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {[
                { icon: Banknote, label: t("الدفع عند الاستلام") },
                { icon: Truck, label: t("توصيل لـ 58 ولاية") },
                { icon: ShieldCheck, label: t("تأكيد هاتفي") },
              ].map((b) => (
                <div
                  key={b.label}
                  className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-2.5 shadow-2xs"
                >
                  <b.icon className="mb-1 size-4 text-[#EA580C]" />
                  <span className="text-[11px] font-medium text-foreground">{b.label}</span>
                </div>
              ))}
            </div>

            {product.features.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {product.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-xs text-muted-foreground sm:text-sm"
                  >
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Check className="size-2.5" />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            )}
            {product.description && (
              <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {product.description}
              </p>
            )}

            {!store.accepting_orders ? (
              <div className="mt-6 rounded-3xl border border-warning/30 bg-warning-soft p-6 text-center text-warning">
                <Lock className="mx-auto mb-2 size-6" />
                <p className="font-medium">{t("المتجر متوقف مؤقتاً عن استقبال الطلبات")}</p>
                <p className="mt-1 text-sm">{t("يرجى المحاولة لاحقاً.")}</p>
              </div>
            ) : (
              <form
                id="order"
                onSubmit={submit}
                onFocusCapture={onFormFocus}
                className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
                style={{
                  ...formVars,
                  backgroundColor: formConfig?.bg_color,
                  borderColor: formConfig?.border_color,
                }}
              >
                <div className="text-center">
                  <h2 className="text-xl font-medium">{t("اطلب الآن — الدفع عند الاستلام")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t("املأ معلوماتك وسنتصل بك لتأكيد الطلب")}
                  </p>
                </div>

                {product.sizes.length > 0 && (
                  <ChipGroup
                    label={t("المقاس")}
                    options={product.sizes}
                    value={size}
                    onChange={setSize}
                  />
                )}
                {product.colors.length > 0 && (
                  <ChipGroup
                    label={t("اللون")}
                    options={product.colors}
                    value={color}
                    onChange={setColor}
                  />
                )}

                {showName && (
                  <div className="space-y-1.5">
                    <Label htmlFor="cname">{t("الاسم واللقب")}</Label>
                    <Input
                      id="cname"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-12 text-base focus:border-[var(--form-focus)]"
                      style={formInputStyle}
                      autoComplete="name"
                    />
                  </div>
                )}
                {showPhone && (
                  <div className="space-y-1.5">
                    <Label htmlFor="cphone">{t("رقم الهاتف")}</Label>
                    <Input
                      id="cphone"
                      dir="ltr"
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={14}
                      placeholder="05 / 06 / 07 XX XX XX XX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9 ]/g, ""))}
                      className={cn(
                        "h-12 text-base focus:border-[var(--form-focus)]",
                        touched && !phoneOk && "border-destructive",
                      )}
                      style={formInputStyle}
                      aria-invalid={touched && !phoneOk}
                    />
                    {touched && !phoneOk && (
                      <p className="text-xs text-danger">
                        {t("يجب أن يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام.")}
                      </p>
                    )}
                  </div>
                )}
                {showConfirmPhone && (
                  <div className="space-y-1.5">
                    <Label htmlFor="cconfirm_phone">{t("تأكيد رقم الهاتف")}</Label>
                    <Input
                      id="cconfirm_phone"
                      dir="ltr"
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={14}
                      placeholder={t("أعد كتابة رقم هاتفك")}
                      value={confirmPhone}
                      onChange={(e) => setConfirmPhone(e.target.value.replace(/[^0-9 ]/g, ""))}
                      className="h-12 text-base focus:border-[var(--form-focus)]"
                      style={formInputStyle}
                    />
                    {touched &&
                      showConfirmPhone &&
                      confirmPhone &&
                      confirmPhone.trim() !== phone.trim() && (
                        <p className="text-xs text-danger">{t("رقم الهاتف غير متطابق.")}</p>
                      )}
                  </div>
                )}
                {showBackupPhone && (
                  <div className="space-y-1.5">
                    <Label htmlFor="cbackup_phone">{t("رقم هاتف إضافي (احتياطي)")}</Label>
                    <Input
                      id="cbackup_phone"
                      dir="ltr"
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={14}
                      placeholder="05 / 06 / 07 XX XX XX XX"
                      value={backupPhone}
                      onChange={(e) => setBackupPhone(e.target.value.replace(/[^0-9 ]/g, ""))}
                      className="h-12 text-base focus:border-[var(--form-focus)]"
                      style={formInputStyle}
                    />
                  </div>
                )}
                {showLocation && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("الولاية")}</Label>
                      <Select
                        value={wilaya}
                        onValueChange={(v) => {
                          setWilaya(v);
                          setCommune("");
                        }}
                        dir={isRtl ? "rtl" : "ltr"}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder={t("اختر الولاية")} />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {WILAYAS.map((w) => (
                            <SelectItem key={w.code} value={String(w.code)}>
                              {w.code} - {isRtl ? w.ar : w.fr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("البلدية")}</Label>
                      <Select
                        value={commune}
                        onValueChange={setCommune}
                        disabled={!wCode}
                        dir={isRtl ? "rtl" : "ltr"}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue
                            placeholder={wCode ? t("اختر البلدية") : t("اختر الولاية أولاً")}
                          />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {communeList.map(([ar, fr]) => (
                            <SelectItem key={fr + ar} value={fr}>
                              {isRtl ? ar : fr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {showAddress && (
                  <div className="space-y-1.5">
                    <Label htmlFor="caddr">{t("العنوان (اختياري)")}</Label>
                    <Input
                      id="caddr"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="h-12 focus:border-[var(--form-focus)]"
                      style={formInputStyle}
                      placeholder={t("الحي، الشارع...")}
                    />
                  </div>
                )}
                {showNotes && (
                  <div className="space-y-1.5">
                    <Label htmlFor="cnotes">{t("ملاحظات إضافية حول الطلب")}</Label>
                    <Input
                      id="cnotes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-12 focus:border-[var(--form-focus)]"
                      style={formInputStyle}
                      placeholder={t("أي تفاصيل إضافية تريد إعلامنا بها...")}
                    />
                  </div>
                )}

                {showDelivery && (
                  <div className="space-y-1.5">
                    <Label>{t("نوع التوصيل")}</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["home", "desk"] as const).map((kind) => {
                        const price = ship(kind);
                        const disabled = !!wCode && price == null;
                        const Icon = kind === "home" ? Home : Building2;
                        return (
                          <button
                            type="button"
                            key={kind}
                            disabled={disabled}
                            onClick={() => setDelivery(kind)}
                            className={cn(
                              "rounded-2xl border-2 p-3 text-start transition-colors disabled:opacity-40",
                              delivery === kind ? "border-brand bg-brand-soft" : "border-border",
                            )}
                          >
                            <Icon
                              className={cn(
                                "mb-1 size-5",
                                delivery === kind ? "text-brand" : "text-muted-foreground",
                              )}
                            />
                            <p className="text-sm font-medium">
                              {kind === "home" ? t("للمنزل") : t("للمكتب (Stopdesk)")}
                            </p>
                            <p className="text-xs text-muted-foreground num">
                              {!wCode
                                ? t("اختر الولاية")
                                : price == null
                                  ? t("غير متوفر")
                                  : price === 0
                                    ? t("مجاني")
                                    : formatDZD(price, language)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Visual Quantity Bundles */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-foreground">
                      {t("اختر الكمية والعرض:")}
                    </Label>
                    {qty > 3 && (
                      <span className="num text-xs text-muted-foreground">
                        {t("الكمية المحددة: {qty}", { qty })}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Bundle 1 */}
                    <button
                      type="button"
                      onClick={() => setQty(1)}
                      className={cn(
                        "relative flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all duration-150",
                        qty === 1
                          ? "border-[#111111] bg-card ring-2 ring-[#111111]/15 shadow-xs"
                          : "border-border bg-card/60 hover:border-zinc-300 hover:bg-card",
                      )}
                    >
                      <span className="text-xs font-bold text-foreground">{t("قطعة واحدة")}</span>
                      <span className="num mt-1 text-[11px] font-medium text-muted-foreground">
                        {formatDZD(product.price * 1, language)}
                      </span>
                    </button>

                    {/* Bundle 2 (Most Popular) */}
                    <button
                      type="button"
                      onClick={() => setQty(2)}
                      className={cn(
                        "relative flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all duration-150",
                        qty === 2
                          ? "border-[#111111] bg-card ring-2 ring-[#111111]/15 shadow-xs"
                          : "border-border bg-card/60 hover:border-zinc-300 hover:bg-card",
                      )}
                    >
                      <span className="absolute -top-2 rounded-full bg-[#111111] px-1.5 py-0.5 text-[9px] font-medium text-white shadow-2xs">
                        {t("الأكثر طلباً")}
                      </span>
                      <span className="text-xs font-bold text-foreground">{t("قطعتان (2)")}</span>
                      <span className="num mt-1 text-[11px] font-medium text-foreground">
                        {formatDZD(product.price * 2, language)}
                      </span>
                    </button>

                    {/* Bundle 3 (Best Value) */}
                    <button
                      type="button"
                      onClick={() => setQty(3)}
                      className={cn(
                        "relative flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all duration-150",
                        qty === 3
                          ? "border-[#111111] bg-card ring-2 ring-[#111111]/15 shadow-xs"
                          : "border-border bg-card/60 hover:border-zinc-300 hover:bg-card",
                      )}
                    >
                      <span className="absolute -top-2 rounded-full bg-[#EA580C] px-1.5 py-0.5 text-[9px] font-medium text-white shadow-2xs">
                        {t("أفضل قيمة")}
                      </span>
                      <span className="text-xs font-bold text-foreground">{t("3 قطع")}</span>
                      <span className="num mt-1 text-[11px] font-medium text-foreground">
                        {formatDZD(product.price * 3, language)}
                      </span>
                    </button>
                  </div>

                  {/* Custom quantity stepper */}
                  <div className="flex items-center justify-between rounded-lg border border-border/80 bg-secondary/15 px-3 py-1.5 text-xs text-muted-foreground">
                    <span>{t("أو حدد كمية مخصصة:")}</span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-7 rounded-md bg-white shadow-2xs"
                        onClick={() => setQty(Math.max(1, qty - 1))}
                        aria-label={t("إنقاص")}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="num w-7 text-center font-bold text-foreground">{qty}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-7 rounded-md bg-white shadow-2xs"
                        onClick={() => setQty(Math.min(20, qty + 1))}
                        aria-label={t("زيادة")}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 rounded-2xl bg-muted/70 p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("سعر المنتج × {qty}", { qty })}
                    </span>
                    <span className="num">{formatDZD(product.price * qty, language)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("التوصيل")}</span>
                    <span className="num">
                      {wCode && currentShip != null ? formatDZD(currentShip, language) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-lg font-medium">
                    <span>{t("الإجمالي")}</span>
                    <span className="text-brand num">{formatDZD(total, language)}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="brand"
                  size="xl"
                  className="w-full"
                  disabled={busy}
                  style={{
                    backgroundColor: formConfig?.button_bg_color,
                    color: formConfig?.button_text_color,
                    borderRadius: formButtonRadius,
                  }}
                >
                  {busy ? <Loader2 className="animate-spin" /> : <Check />}{" "}
                  {t(formConfig?.button_text || "تأكيد الطلب الآن")}
                </Button>
                {showWhatsappOrder && whatsappTarget && (
                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    size="xl"
                    className="w-full border-emerald-500/40 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                    style={{ borderRadius: formButtonRadius }}
                  >
                    <a
                      href={whatsappLink(
                        whatsappTarget,
                        isRtl
                          ? `السلام عليكم، أريد طلب منتج: ${product.name}${size ? ` - المقاس: ${size}` : ""}${color ? ` - اللون: ${color}` : ""} - الكمية: ${qty} - الإجمالي: ${formatDZD(total, language)}`
                          : `Hello, I would like to order: ${product.name}${size ? ` - Size: ${size}` : ""}${color ? ` - Color: ${color}` : ""} - Qty: ${qty} - Total: ${formatDZD(total, language)}`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="size-5 text-emerald-600 dark:text-emerald-400" />
                      <span>{t("أو اطلب مباشرة عبر واتساب")}</span>
                    </a>
                  </Button>
                )}
                {formConfig?.guarantee_text ? (
                  <p className="text-center text-xs text-muted-foreground">
                    {t(formConfig.guarantee_text)}
                  </p>
                ) : null}
              </form>
            )}
          </div>
        </div>

        {store.accepting_orders && (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 p-3 pb-safe backdrop-blur lg:hidden">
            <Button asChild variant="brand" size="lg" className="w-full">
              <a href="#order">
                {t("اطلب الآن ·")} <span className="num">{formatDZD(total, language)}</span>
              </a>
            </Button>
          </div>
        )}

        <div className="border-t">
          <StoreFaq config={store.storefront_config?.sections?.faq} />
        </div>
      </div>
    </StoreChrome>
  );
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            type="button"
            key={o}
            onClick={() => onChange(o)}
            className={cn(
              "min-w-12 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-colors",
              value === o
                ? "border-brand bg-brand-soft text-brand"
                : "border-border hover:border-brand/40",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
