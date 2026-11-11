import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, ExternalLink, ImagePlus, Loader2, Plus, Save, Star, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { friendlyError } from "@/lib/commerce";
import {
  DEFAULT_FAQ_BY_LANGUAGE,
  HERO_PRESETS,
  PRESET_KEYS,
  STOREFRONT_DEFAULTS,
  STOREFRONT_LANGUAGE_DEFAULT,
  TRUST_BADGE_KEYS,
  TRUST_BADGE_LABELS,
  parseStorefrontConfig,
  storefrontConfigSchema,
  type FaqItem,
  type PresetKey,
  type ReviewItem,
  type StorefrontLanguage,
  type TrustBadgeKey,
} from "@/lib/storefront-theme";
import { useTr } from "@/lib/ui-i18n";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { useSignedUrls } from "@/hooks/use-signed-urls";
import { fileExt, PRODUCT_BUCKET } from "@/lib/images";

type Store = Tables<"stores">;

export function StorefrontThemeSettings({
  store,
  readOnly,
  userId,
}: {
  store: Store | null;
  readOnly: boolean;
  userId: string;
}) {
  const t = useTr();
  const qc = useQueryClient();
  const language: StorefrontLanguage = store
    ? parseStorefrontConfig(store.storefront_config, store.name).language
    : STOREFRONT_LANGUAGE_DEFAULT;
  const defaults = STOREFRONT_DEFAULTS[language];
  const imageFileRef = useRef<HTMLInputElement>(null);

  const [preset, setPreset] = useState<PresetKey>("noir");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState(defaults.heroSubtitle);
  const [heroButton, setHeroButton] = useState(defaults.heroButton);
  const [barEnabled, setBarEnabled] = useState(true);
  const [barText, setBarText] = useState(defaults.barText);
  const [heroBgType, setHeroBgType] = useState<"color" | "image">("color");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroBgColor, setHeroBgColor] = useState("#111111");
  const [heroTextColor, setHeroTextColor] = useState("#FFFFFF");
  const [heroOverlayOpacity, setHeroOverlayOpacity] = useState(40);
  const [fontFamily, setFontFamily] = useState("Tajawal");
  const [titleSize, setTitleSize] = useState("xl");
  const [textAlign, setTextAlign] = useState("center");
  const [buttonBgColor, setButtonBgColor] = useState("#FFFFFF");
  const [buttonTextColor, setButtonTextColor] = useState("#111111");
  const [buttonSize, setButtonSize] = useState("md");
  const [buttonRadius, setButtonRadius] = useState("lg");
  const [buttonAlign, setButtonAlign] = useState("center");
  const [barBgColor, setBarBgColor] = useState("#111111");
  const [barTextColor, setBarTextColor] = useState("#FFFFFF");
  const [activeTab, setActiveTab] = useState<"hero" | "button" | "bar" | "sections">("hero");
  const [imageUploading, setImageUploading] = useState(false);
  const signedUrls = useSignedUrls([heroImageUrl]);
  const previewHeroImage = heroImageUrl.startsWith("http") ? heroImageUrl : signedUrls[heroImageUrl];

  // Sections
  const [faqEnabled, setFaqEnabled] = useState(true);
  const [faqItems, setFaqItems] = useState<FaqItem[]>(DEFAULT_FAQ_BY_LANGUAGE[language]);

  const [reviewsEnabled, setReviewsEnabled] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);

  const [socialEnabled, setSocialEnabled] = useState(true);
  const [socialWhatsapp, setSocialWhatsapp] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialTiktok, setSocialTiktok] = useState("");

  const [trustEnabled, setTrustEnabled] = useState(true);
  const [trustBadges, setTrustBadges] = useState<TrustBadgeKey[]>([...TRUST_BADGE_KEYS]);

  useEffect(() => {
    if (!store) return;
    const cfg = parseStorefrontConfig(store.storefront_config, store.name);
    setPreset(cfg.preset);
    setHeroTitle(cfg.hero_title);
    setHeroSubtitle(cfg.hero_subtitle);
    setHeroButton(cfg.hero_button);
    setBarEnabled(cfg.bar_enabled);
    setBarText(cfg.bar_text);
    setHeroBgType(cfg.hero_bg_type);
    setHeroImageUrl(cfg.hero_image_url ?? "");
    setHeroBgColor(cfg.hero_bg_color);
    setHeroTextColor(cfg.hero_text_color);
    setHeroOverlayOpacity(cfg.hero_overlay_opacity);
    setFontFamily(cfg.font_family);
    setTitleSize(cfg.title_size);
    setTextAlign(cfg.text_align);
    setButtonBgColor(cfg.button_bg_color);
    setButtonTextColor(cfg.button_text_color);
    setButtonSize(cfg.button_size);
    setButtonRadius(cfg.button_radius);
    setButtonAlign(cfg.button_align);
    setBarBgColor(cfg.bar_bg_color);
    setBarTextColor(cfg.bar_text_color);

    setFaqEnabled(cfg.sections.faq.enabled);
    setFaqItems(cfg.sections.faq.items);

    setReviewsEnabled(cfg.sections.reviews.enabled);
    setReviewItems(cfg.sections.reviews.items);

    setSocialEnabled(cfg.sections.social.enabled);
    setSocialWhatsapp(cfg.sections.social.whatsapp || store.whatsapp || "");
    setSocialInstagram(cfg.sections.social.instagram || "");
    setSocialFacebook(cfg.sections.social.facebook || "");
    setSocialTiktok(cfg.sections.social.tiktok || "");

    setTrustEnabled(cfg.sections.trust.enabled);
    setTrustBadges(cfg.sections.trust.badges);
  }, [store]);

  async function uploadHeroImage(file: File | undefined) {
    if (!file || !store) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast.error(t("اختر صورة لا يتجاوز حجمها 5 ميغابايت."));
      return;
    }
    if (!userId) {
      toast.error(t("تعذر رفع صورة الواجهة."));
      return;
    }
    setImageUploading(true);
    const extension = fileExt(file).replace(/[^a-z0-9]/gi, "") || "jpg";
    const path = `${userId}/hero-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(PRODUCT_BUCKET).upload(path, file, { contentType: file.type });
    setImageUploading(false);
    if (error) {
      toast.error(t("تعذر رفع صورة الواجهة."));
      return;
    }
    setHeroImageUrl(path);
    setHeroBgType("image");
  }

  function addFaqItem() {
    if (faqItems.length >= 8) return;
    setFaqItems([...faqItems, { q: "", a: "" }]);
  }

  function updateFaqItem(index: number, field: "q" | "a", val: string) {
    setFaqItems(
      faqItems.map((item, i) => (i === index ? { ...item, [field]: val } : item)),
    );
  }

  function ColorControl({
    label,
    value,
    onChange,
    disabled,
    presets = [],
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled: boolean;
    presets?: string[];
  }) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center justify-between gap-3">
          <span>{label}</span>
          <span className="flex items-center gap-2 rounded-lg border px-2 py-1 text-xs font-normal" dir="ltr">
            <input
              type="color"
              value={value}
              onChange={(event) => onChange(event.target.value.toUpperCase())}
              disabled={disabled}
              className="size-6 cursor-pointer rounded border-0 bg-transparent p-0 disabled:cursor-not-allowed"
              aria-label={label}
            />
            {value}
          </span>
        </Label>
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {presets.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onChange(color)}
                disabled={disabled}
                aria-label={color}
                className={cn("size-7 rounded-full border border-border disabled:cursor-not-allowed", value.toLowerCase() === color.toLowerCase() ? "ring-2 ring-primary ring-offset-2" : "")}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  function OptionButtons({
    label,
    value,
    values,
    onChange,
    disabled,
    t,
  }: {
    label: string;
    value: string;
    values: string[];
    onChange: (value: string) => void;
    disabled: boolean;
    t: ReturnType<typeof useTr>;
  }) {
    const labels: Record<string, string> = {
      sm: "صغير",
      md: "متوسط",
      lg: "كبير",
      base: "أساسي",
      xl: "كبير",
      "2xl": "كبير جداً",
      none: "حواف حادة",
      full: "كبسولة كاملة",
      soft: "دائرية خفيفة",
      round: "دائرية",
      start: "يمين",
      center: "وسط",
      end: "يسار",
    };
    const isRadius = values.includes("none") || values.includes("full");
    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{label}</legend>
        <div className="flex flex-wrap gap-2">
          {values.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              disabled={disabled}
              aria-pressed={value === option}
              className={cn("rounded-xl border px-4 py-2 text-sm disabled:cursor-not-allowed", value === option ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
            >
              {t(isRadius && option === "md" ? "دائرية خفيفة" : isRadius && option === "lg" ? "دائرية" : labels[option] ?? option)}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }

  function removeFaqItem(index: number) {
    setFaqItems(faqItems.filter((_, i) => i !== index));
  }

  function addReviewItem() {
    if (reviewItems.length >= 10) return;
    setReviewItems([...reviewItems, { name: "", text: "", rating: 5 }]);
  }

  function updateReviewItem(
    index: number,
    field: "name" | "text" | "rating",
    val: string | number,
  ) {
    setReviewItems(
      reviewItems.map((item, i) => (i === index ? { ...item, [field]: val } : item)),
    );
  }

  function removeReviewItem(index: number) {
    setReviewItems(reviewItems.filter((_, i) => i !== index));
  }

  function toggleTrustBadge(key: TrustBadgeKey) {
    if (trustBadges.includes(key)) {
      setTrustBadges(trustBadges.filter((b) => b !== key));
    } else {
      setTrustBadges([...trustBadges, key]);
    }
  }

  function selectPreset(key: PresetKey) {
    const colors = HERO_PRESETS[key];
    setPreset(key);
    setHeroBgColor(colors.from);
    setHeroTextColor(colors.textColor);
    setButtonBgColor(colors.buttonBg);
    setButtonTextColor(colors.buttonText);
  }

  const saveTheme = useMutation({
    mutationFn: async () => {
      if (!store) throw new Error("STORE_NOT_FOUND");
      const payload = {
        preset,
        language,
        hero_title: heroTitle.trim(),
        hero_subtitle: heroSubtitle.trim(),
        hero_button: heroButton.trim(),
        hero_bg_type: heroBgType,
        hero_image_url: heroImageUrl || undefined,
        hero_bg_color: heroBgColor,
        hero_text_color: heroTextColor,
        hero_overlay_opacity: heroOverlayOpacity,
        font_family: fontFamily,
        title_size: titleSize,
        text_align: textAlign,
        button_bg_color: buttonBgColor,
        button_text_color: buttonTextColor,
        button_size: buttonSize,
        button_radius: buttonRadius,
        button_align: buttonAlign,
        bar_enabled: barEnabled,
        bar_text: barText.trim(),
        bar_bg_color: barBgColor,
        bar_text_color: barTextColor,
        sections: {
          faq: {
            enabled: faqEnabled,
            items: faqItems.filter((i) => i.q.trim() && i.a.trim()),
          },
          reviews: {
            enabled: reviewsEnabled,
            items: reviewItems.filter((r) => r.name.trim() && r.text.trim()),
          },
          social: {
            enabled: socialEnabled,
            whatsapp: socialWhatsapp.trim() || undefined,
            instagram: socialInstagram.trim() || undefined,
            facebook: socialFacebook.trim() || undefined,
            tiktok: socialTiktok.trim() || undefined,
          },
          trust: {
            enabled: trustEnabled,
            badges: trustBadges,
          },
        },
      };

      const validated = storefrontConfigSchema.parse(payload);

      const { error } = await supabase
        .from("stores")
        .update({
          storefront_config: validated,
        })
        .eq("id", store.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("تم حفظ مظهر المتجر بنجاح"));
      qc.invalidateQueries({ queryKey: ["my-store"] });
    },
    onError: (e: Error) => {
      toast.error(t(friendlyError(e.message, t("تعذر حفظ مظهر المتجر"))));
    },
  });

  const badgeLabels = TRUST_BADGE_LABELS[language];
  const storeUrl = typeof window !== "undefined" && store ? `${window.location.origin}/m/${store.slug}` : "";
  const heroBackground = heroBgType === "image" && previewHeroImage
    ? {
        backgroundColor: heroBgColor,
        backgroundImage: `linear-gradient(rgba(0,0,0,${heroOverlayOpacity / 100}), rgba(0,0,0,${heroOverlayOpacity / 100})), url("${previewHeroImage}")`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }
    : { backgroundColor: heroBgColor };
  const titleSizeClass: Record<string, string> = {
    sm: "text-base sm:text-lg",
    base: "text-lg sm:text-xl",
    lg: "text-xl sm:text-2xl",
    xl: "text-2xl sm:text-4xl",
    "2xl": "text-3xl sm:text-5xl",
  };
  const buttonSizeClass: Record<string, string> = {
    sm: "h-9 px-5 text-xs",
    md: "h-11 px-7 text-sm",
    lg: "h-14 px-10 text-base",
  };
  const buttonRadiusClass: Record<string, string> = {
    none: "rounded-none",
    md: "rounded-lg",
    lg: "rounded-2xl",
    full: "rounded-full",
  };
  const buttonAlignClass: Record<string, string> = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
  };
  const textAlignClass: Record<string, string> = {
    start: "text-start",
    center: "text-center",
    end: "text-end",
  };
  const tabs = [
    { id: "hero" as const, label: t("الواجهة الرئيسية") },
    { id: "button" as const, label: t("زر الطلب") },
    { id: "bar" as const, label: t("شريط الإعلان") },
    { id: "sections" as const, label: t("أقسام المتجر") },
  ];

  return (
    <div className="space-y-6">
      <header className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div>
          <h1 className="text-lg font-bold text-foreground">{t("تصميم المتجر")}</h1>
          <p className="text-xs text-muted-foreground">{t("تخصيص ألوان الواجهة الرئيسية والتحكم في أقسام صفحة الهبوط.")}</p>
        </div>
        <div className="flex items-center gap-2">
          {storeUrl && (
            <Button asChild type="button" variant="outline" size="sm">
              <a href={storeUrl} target="_blank" rel="noreferrer">
                {t("معاينة المتجر")} <ExternalLink className="ms-1 size-4" />
              </a>
            </Button>
          )}
          <Button
            type="button"
            variant="brand"
            size="sm"
            onClick={() => saveTheme.mutate()}
            disabled={saveTheme.isPending || readOnly || imageUploading}
          >
            {saveTheme.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {t("حفظ التعديلات")}
          </Button>
        </div>
      </header>

      <div role="tablist" aria-label={t("أقسام محرر التصميم")} className="flex gap-2 overflow-x-auto rounded-2xl bg-muted p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "shrink-0 rounded-xl px-4 py-2 text-sm transition-colors",
              activeTab === tab.id ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Main Configuration Card */}
        <div className="space-y-6">
          {/* Colors & Hero config card */}
          <div className={cn("space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card", activeTab === "hero" || activeTab === "bar" ? "" : "hidden")}>
            <h3 className="text-base font-bold text-foreground">{activeTab === "bar" ? t("شريط الإعلان العلوي") : t("الواجهة الرئيسية (Hero)")}</h3>

            {/* 6 Round Swatches */}
            <div className={cn("space-y-2.5", activeTab === "hero" ? "" : "hidden")}>
              <Label className="text-sm font-medium">{t("ألوان الواجهة الرئيسية")}</Label>
              <div className="flex flex-wrap items-center gap-3.5">
                {PRESET_KEYS.map((key) => {
                  const p = HERO_PRESETS[key];
                  const isSelected = preset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectPreset(key)}
                      title={t(p.label)}
                      disabled={readOnly}
                      className={cn(
                        "relative flex size-11 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none",
                        isSelected
                          ? "ring-2 ring-primary ring-offset-2 scale-105"
                          : "border border-border/80",
                      )}
                      style={{
                        background: `linear-gradient(135deg, ${p.from} 0%, ${p.from} 50%, ${p.to} 50%, ${p.to} 100%)`,
                      }}
                      aria-label={t(p.label)}
                    >
                      {isSelected && (
                        <Check
                          className="size-4 drop-shadow-sm"
                          style={{ color: p.textColor }}
                          strokeWidth={2.5}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("النمط المختار:")}{" "}
                <span className="font-medium text-foreground">{t(HERO_PRESETS[preset]?.label ?? "")}</span>
              </p>
            </div>

            {/* Hero Inputs */}
            <div className={cn("space-y-4 pt-2", activeTab === "hero" ? "" : "hidden")}>
              <div className="space-y-2">
                <Label>{t("خلفية الواجهة")}</Label>
                <div className="flex gap-2">
                  {(["color", "image"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setHeroBgType(type)}
                      disabled={readOnly}
                      className={cn("rounded-xl border px-4 py-2 text-sm", heroBgType === type ? "border-primary bg-primary/10 text-primary" : "border-border")}
                    >
                      {type === "color" ? t("لون سادة") : t("صورة")}
                    </button>
                  ))}
                </div>
                {heroBgType === "image" ? (
                  <div className="space-y-2">
                    <input
                      ref={imageFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        void uploadHeroImage(event.target.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => imageFileRef.current?.click()} disabled={readOnly || imageUploading}>
                        {imageUploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                        {t("رفع صورة للواجهة")}
                      </Button>
                      {heroImageUrl && (
                        <Button type="button" variant="ghost" size="icon" aria-label={t("حذف الصورة")} onClick={() => setHeroImageUrl("")} disabled={readOnly}>
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("صورة JPG أو PNG حتى 5 ميغابايت.")}</p>
                    {previewHeroImage && <img src={previewHeroImage} alt="" className="h-28 w-full rounded-xl object-cover" />}
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="hero-overlay">{t("تعتيم الصورة")} · {heroOverlayOpacity}%</Label>
                      <input
                        id="hero-overlay"
                        type="range"
                        min="0"
                        max="90"
                        value={heroOverlayOpacity}
                        onChange={(event) => setHeroOverlayOpacity(Number(event.target.value))}
                        disabled={readOnly}
                        className="w-full accent-primary"
                      />
                    </div>
                  </div>
                ) : (
                  <ColorControl
                    label={t("لون خلفية الواجهة")}
                    value={heroBgColor}
                    onChange={setHeroBgColor}
                    disabled={readOnly}
                    presets={["#111111", "#1C1C1C", "#0F1B33", "#0F3D2E", "#3B1F3A", "#F5F5F5"]}
                  />
                )}
              </div>
              <ColorControl label={t("لون نص الواجهة")} value={heroTextColor} onChange={setHeroTextColor} disabled={readOnly} presets={["#FFFFFF", "#111111", "#F5D17A"]} />
              <div className="space-y-1.5">
                <Label htmlFor="th-title">{t("عنوان الواجهة")}</Label>
                <Input
                  id="th-title"
                  placeholder={store?.name || t("اسم متجرك")}
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value.slice(0, 80))}
                  maxLength={80}
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="th-subtitle">{t("الوصف الترحيبي")}</Label>
                <Input
                  id="th-subtitle"
                  placeholder={defaults.heroSubtitle}
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value.slice(0, 160))}
                  maxLength={160}
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="th-btn">{t("نص الزر")}</Label>
                <Input
                  id="th-btn"
                  placeholder={defaults.heroButton}
                  value={heroButton}
                  onChange={(e) => setHeroButton(e.target.value.slice(0, 30))}
                  maxLength={30}
                  disabled={readOnly}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="font-family">{t("نوع الخط")}</Label>
                  <select id="font-family" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm" value={fontFamily} disabled={readOnly} onChange={(event) => setFontFamily(event.target.value)}>
                    {["Tajawal", "Cairo", "Almarai", "Readex Pro", "Outfit", "Plus Jakarta Sans"].map((font) => (
                      <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="title-size">{t("حجم العنوان")}</Label>
                  <select id="title-size" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm" value={titleSize} disabled={readOnly} onChange={(event) => setTitleSize(event.target.value)}>
                    {([
                      ["sm", "صغير"],
                      ["base", "أساسي"],
                      ["lg", "متوسط"],
                      ["xl", "كبير"],
                      ["2xl", "كبير جداً"],
                    ] as const).map(([size, label]) => <option key={size} value={size}>{t(label)}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="text-align">{t("محاذاة النص")}</Label>
                  <select id="text-align" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm" value={textAlign} disabled={readOnly} onChange={(event) => setTextAlign(event.target.value)}>
                    <option value="start">{t("يمين")}</option><option value="center">{t("وسط")}</option><option value="end">{t("يسار")}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Announcement Bar */}
            <div className={cn("space-y-3 pt-2", activeTab === "bar" ? "" : "hidden")}>
              <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
                <div>
                  <Label htmlFor="sw-bar" className="cursor-pointer text-sm font-medium">
                    {t("شريط الإعلانات العلوي")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("شريط إشعار أسود أعلى صفحة المتجر قابل للإغلاق.")}
                  </p>
                </div>
                <Switch
                  id="sw-bar"
                  checked={barEnabled}
                  onCheckedChange={setBarEnabled}
                  disabled={readOnly}
                />
              </div>

              {barEnabled && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                  <Label htmlFor="th-bar">{t("نص شريط الإعلانات")}</Label>
                  <Input
                    id="th-bar"
                    placeholder={defaults.barText}
                    value={barText}
                    onChange={(e) => setBarText(e.target.value.slice(0, 80))}
                    maxLength={80}
                    disabled={readOnly}
                  />
                  </div>
                  <ColorControl label={t("لون خلفية الشريط")} value={barBgColor} onChange={setBarBgColor} disabled={readOnly} presets={["#111111", "#FFFFFF", "#C9A24B", "#0F3D2E"]} />
                  <ColorControl label={t("لون نص الشريط")} value={barTextColor} onChange={setBarTextColor} disabled={readOnly} presets={["#FFFFFF", "#111111", "#F5D17A"]} />
                </div>
              )}
            </div>
          </div>

          {activeTab === "button" && (
            <div className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="font-bold">{t("زر الطلب الرئيسي")}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorControl label={t("خلفية الزر")} value={buttonBgColor} onChange={setButtonBgColor} disabled={readOnly} presets={["#FFFFFF", "#111111", "#C9A24B", "#0F3D2E"]} />
                <ColorControl label={t("لون نص الزر")} value={buttonTextColor} onChange={setButtonTextColor} disabled={readOnly} presets={["#111111", "#FFFFFF", "#F5D17A"]} />
              </div>
              <OptionButtons label={t("حجم الزر")} value={buttonSize} values={["sm", "md", "lg"]} onChange={setButtonSize} disabled={readOnly} t={t} />
              <OptionButtons label={t("استدارة الحواف")} value={buttonRadius} values={["none", "md", "lg", "full"]} onChange={setButtonRadius} disabled={readOnly} t={t} />
              <OptionButtons label={t("محاذاة الزر")} value={buttonAlign} values={["start", "center", "end"]} onChange={setButtonAlign} disabled={readOnly} t={t} />
            </div>
          )}

          {/* Landing Sections Manager */}
          <div className={cn("space-y-4", activeTab === "sections" ? "" : "hidden")}>
            <div>
              <h3 className="text-base font-bold text-foreground">{t("أقسام صفحة الهبوط")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("تحكم في الأقسام المعروضة أسفل المنتجات في صفحة متجرك.")}
              </p>
            </div>

            {/* 1. FAQ Card */}
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">{t("الأسئلة الشائعة (FAQ)")}</p>
                  <p className="text-xs text-muted-foreground">{t("إجابات مختصرة لطمأنة الزبائن قبل الطلب.")}</p>
                </div>
                <Switch checked={faqEnabled} onCheckedChange={setFaqEnabled} disabled={readOnly} />
              </div>

              {faqEnabled && (
                <div className="space-y-3 pt-2">
                  {faqItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="space-y-2 rounded-xl border border-border bg-background/50 p-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          {t("السؤال #{n}", { n: idx + 1 })}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFaqItem(idx)}
                          className="size-7 p-0 text-destructive hover:bg-destructive/10"
                          disabled={readOnly}
                          aria-label={t("حذف السؤال")}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      <Input
                        placeholder={t("نص السؤال (مثال: شحال ثمن التوصيل؟)")}
                        value={item.q}
                        onChange={(e) => updateFaqItem(idx, "q", e.target.value)}
                        maxLength={80}
                        disabled={readOnly}
                      />
                      <Textarea
                        placeholder={t("نص الإجابة...")}
                        value={item.a}
                        onChange={(e) => updateFaqItem(idx, "a", e.target.value)}
                        maxLength={300}
                        rows={2}
                        disabled={readOnly}
                      />
                    </div>
                  ))}

                  {faqItems.length < 8 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addFaqItem}
                      disabled={readOnly}
                      className="w-full rounded-full"
                    >
                      <Plus className="size-3.5" /> {t("إضافة سؤال جديد ({n}/8)", { n: faqItems.length })}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* 2. Reviews Card */}
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">{t("تقييمات وآراء العملاء")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("تظهر فقط التقييمات التي تقوم بكتابتها بنفسك.")}
                  </p>
                </div>
                <Switch
                  checked={reviewsEnabled}
                  onCheckedChange={setReviewsEnabled}
                  disabled={readOnly}
                />
              </div>

              {reviewsEnabled && (
                <div className="space-y-3 pt-2">
                  {reviewItems.length === 0 && (
                    <p className="text-center py-4 text-xs text-muted-foreground">
                      {t("لم تتم إضافة أي تقييم بعد. انقر أدناه لإضافة أول تقييم لزبائنك.")}
                    </p>
                  )}

                  {reviewItems.map((rev, idx) => (
                    <div
                      key={idx}
                      className="space-y-2.5 rounded-xl border border-border bg-background/50 p-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => updateReviewItem(idx, "rating", star)}
                              disabled={readOnly}
                              className="p-0.5 transition-transform hover:scale-110 disabled:pointer-events-none"
                              aria-label={t("{n} نجوم", { n: star })}
                            >
                              <Star
                                className={cn(
                                  "size-4",
                                  star <= rev.rating
                                    ? "fill-brand text-brand"
                                    : "fill-muted text-muted-foreground/30",
                                )}
                              />
                            </button>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeReviewItem(idx)}
                          className="size-7 p-0 text-destructive hover:bg-destructive/10"
                          disabled={readOnly}
                          aria-label={t("حذف التقييم")}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>

                      <Input
                        placeholder={t("اسم العميل (مثال: أمين - وهران)")}
                        value={rev.name}
                        onChange={(e) => updateReviewItem(idx, "name", e.target.value)}
                        maxLength={60}
                        disabled={readOnly}
                      />

                      <Textarea
                        placeholder={t("نص التقييم أو تجربة العميل...")}
                        value={rev.text}
                        onChange={(e) => updateReviewItem(idx, "text", e.target.value)}
                        maxLength={300}
                        rows={2}
                        disabled={readOnly}
                      />
                    </div>
                  ))}

                  {reviewItems.length < 10 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addReviewItem}
                      disabled={readOnly}
                      className="w-full rounded-full"
                    >
                      <Plus className="size-3.5" /> {t("إضافة تقييم جديد ({n}/10)", { n: reviewItems.length })}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* 3. Social Links Card */}
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">{t("روابط التواصل الاجتماعي")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("أزرار دائرية تظهر أسفل صفحة المتجر للوصول لحساباتك.")}
                  </p>
                </div>
                <Switch
                  checked={socialEnabled}
                  onCheckedChange={setSocialEnabled}
                  disabled={readOnly}
                />
              </div>

              {socialEnabled && (
                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="so-wa">{t("واتساب")}</Label>
                    <Input
                      id="so-wa"
                      dir="ltr"
                      placeholder="0550123456"
                      value={socialWhatsapp}
                      onChange={(e) => setSocialWhatsapp(e.target.value)}
                      disabled={readOnly}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="so-ig">{t("إنستغرام")}</Label>
                    <Input
                      id="so-ig"
                      dir="ltr"
                      placeholder="instagram.com/yourstore"
                      value={socialInstagram}
                      onChange={(e) => setSocialInstagram(e.target.value)}
                      disabled={readOnly}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="so-fb">{t("فيسبوك")}</Label>
                    <Input
                      id="so-fb"
                      dir="ltr"
                      placeholder="facebook.com/yourstore"
                      value={socialFacebook}
                      onChange={(e) => setSocialFacebook(e.target.value)}
                      disabled={readOnly}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="so-tt">{t("تيك توك")}</Label>
                    <Input
                      id="so-tt"
                      dir="ltr"
                      placeholder="tiktok.com/@yourstore"
                      value={socialTiktok}
                      onChange={(e) => setSocialTiktok(e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. Trust Badges Card */}
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">{t("شارات الثقة والضمان")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("شارات تطمئن المشتري مثل الدفع عند الاستلام والتوصيل.")}
                  </p>
                </div>
                <Switch
                  checked={trustEnabled}
                  onCheckedChange={setTrustEnabled}
                  disabled={readOnly}
                />
              </div>

              {trustEnabled && (
                <div className="flex flex-wrap gap-2.5 pt-2">
                  {TRUST_BADGE_KEYS.map((key) => {
                    const badge = badgeLabels[key];
                    const active = trustBadges.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleTrustBadge(key)}
                        disabled={readOnly}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors disabled:pointer-events-none",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-foreground/50",
                        )}
                      >
                        {active && <Check className="size-3.5" />}
                        <span>{badge}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Preview Column (Sticky on Desktop) */}
        <div className="order-first space-y-6 lg:order-last">
          <div className="sticky top-6 space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <div className="flex items-center justify-between border-b bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground">
                <span className="font-medium">{t("معاينة مباشرة")}</span>
                <span className="rounded-full bg-card px-2.5 py-0.5 text-[11px] font-medium border text-foreground">
                  {t("مباشر")}
                </span>
              </div>
              <div className="flex items-center justify-between border-b bg-card px-4 py-3 text-sm">
                <span className="font-medium">{store?.name || t("اسم متجرك")}</span>
                <span className="text-xs text-muted-foreground">{t("منتجاتنا")}</span>
              </div>

              {barEnabled && (
                <button
                  type="button"
                  onClick={() => setActiveTab("bar")}
                  style={{ backgroundColor: barBgColor, color: barTextColor }}
                  className={cn("w-full px-3 py-2 text-center text-xs", activeTab === "bar" ? "ring-2 ring-inset ring-brand" : "")}
                >
                  {barText || defaults.barText}
                </button>
              )}

              <div
                style={{ ...heroBackground, color: heroTextColor, fontFamily }}
                onClick={() => setActiveTab("hero")}
                className={cn("cursor-pointer p-6 transition-colors sm:p-8", activeTab === "hero" ? "ring-2 ring-inset ring-brand" : "")}
              >
                <p className={cn("font-normal leading-tight", titleSizeClass[titleSize], textAlignClass[textAlign])}>
                  {heroTitle || store?.name || t("اسم متجرك")}
                </p>
                <p className={cn("mt-2 max-w-xs text-xs font-light leading-relaxed opacity-90", textAlign === "center" ? "mx-auto" : textAlign === "start" ? "me-auto" : "ms-auto", textAlignClass[textAlign])}>
                  {heroSubtitle || defaults.heroSubtitle}
                </p>
                <div className={cn("mt-4 flex", buttonAlignClass[buttonAlign])}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveTab("button");
                    }}
                    style={{ backgroundColor: buttonBgColor, color: buttonTextColor }}
                    className={cn("inline-flex items-center justify-center font-normal shadow-sm", buttonSizeClass[buttonSize], buttonRadiusClass[buttonRadius], activeTab === "button" ? "ring-2 ring-brand ring-offset-2" : "")}
                  >
                    {heroButton || defaults.heroButton}
                  </button>
                </div>
              </div>
              {trustEnabled && (
              <button
                type="button"
                onClick={() => setActiveTab("sections")}
                className={cn("grid w-full grid-cols-3 gap-2 p-3 text-center", activeTab === "sections" ? "ring-2 ring-inset ring-brand" : "")}
              >
                {trustBadges.slice(0, 3).map((badgeKey) => (
                  <span key={badgeKey} className="rounded-xl border bg-background px-2 py-2 text-[10px]">
                    {badgeLabels[badgeKey]}
                  </span>
                ))}
                {trustBadges.length === 0 && <span className="col-span-3 text-xs text-muted-foreground">{t("شارات الثقة")}</span>}
              </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
