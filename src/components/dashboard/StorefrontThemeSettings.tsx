import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Plus, Save, Star, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { friendlyError } from "@/lib/commerce";
import {
  DEFAULT_FAQ,
  HERO_PRESETS,
  PRESET_KEYS,
  TRUST_BADGES,
  TRUST_BADGE_KEYS,
  parseStorefrontConfig,
  presetStyles,
  storefrontConfigSchema,
  type FaqItem,
  type PresetKey,
  type ReviewItem,
  type TrustBadgeKey,
} from "@/lib/storefront-theme";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Store = Tables<"stores">;

export function StorefrontThemeSettings({
  store,
  readOnly,
}: {
  store: Store | null;
  readOnly: boolean;
}) {
  const qc = useQueryClient();

  const [preset, setPreset] = useState<PresetKey>("noir");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("اطلب الآن والدفع عند الاستلام");
  const [heroButton, setHeroButton] = useState("تسوق الآن");
  const [barEnabled, setBarEnabled] = useState(true);
  const [barText, setBarText] = useState("مرحبا بك في متجرنا");

  // Sections
  const [faqEnabled, setFaqEnabled] = useState(true);
  const [faqItems, setFaqItems] = useState<FaqItem[]>(DEFAULT_FAQ);

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

  function addFaqItem() {
    if (faqItems.length >= 8) return;
    setFaqItems([...faqItems, { q: "", a: "" }]);
  }

  function updateFaqItem(index: number, field: "q" | "a", val: string) {
    setFaqItems(
      faqItems.map((item, i) => (i === index ? { ...item, [field]: val } : item)),
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

  const saveTheme = useMutation({
    mutationFn: async () => {
      if (!store) throw new Error("STORE_NOT_FOUND");
      const payload = {
        preset,
        hero_title: heroTitle.trim(),
        hero_subtitle: heroSubtitle.trim(),
        hero_button: heroButton.trim(),
        bar_enabled: barEnabled,
        bar_text: barText.trim(),
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
      toast.success("تم حفظ مظهر المتجر بنجاح");
      qc.invalidateQueries({ queryKey: ["my-store"] });
    },
    onError: (e: Error) => {
      toast.error(friendlyError(e.message, "تعذر حفظ مظهر المتجر"));
    },
  });

  const previewStyles = presetStyles(preset);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">مظهر المتجر</h2>
          <p className="text-sm text-muted-foreground">
            تخصيص ألوان الواجهة الرئيسية والتحكم في أقسام صفحة الهبوط.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Main Configuration Card */}
        <div className="space-y-6">
          {/* Colors & Hero config card */}
          <div className="space-y-5 rounded-2xl border border-[#EEEEEE] bg-card p-6 shadow-card">
            <h3 className="text-base font-bold text-foreground">الواجهة الرئيسية (Hero)</h3>

            {/* 6 Round Swatches */}
            <div className="space-y-2.5">
              <Label className="text-sm font-medium">ألوان الواجهة الرئيسية</Label>
              <div className="flex flex-wrap items-center gap-3.5">
                {PRESET_KEYS.map((key) => {
                  const p = HERO_PRESETS[key];
                  const isSelected = preset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPreset(key)}
                      title={p.label}
                      disabled={readOnly}
                      className={cn(
                        "relative flex size-11 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none",
                        isSelected
                          ? "ring-2 ring-[#111111] ring-offset-2 scale-105"
                          : "border border-border/80",
                      )}
                      style={{
                        background: `linear-gradient(135deg, ${p.from} 0%, ${p.from} 50%, ${p.to} 50%, ${p.to} 100%)`,
                      }}
                      aria-label={p.label}
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
                النمط المختار:{" "}
                <span className="font-medium text-foreground">{HERO_PRESETS[preset]?.label}</span>
              </p>
            </div>

            {/* Hero Inputs */}
            <div className="space-y-3.5 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="th-title">عنوان الواجهة</Label>
                <Input
                  id="th-title"
                  placeholder={store?.name || "اسم متجرك"}
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value.slice(0, 80))}
                  maxLength={80}
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="th-subtitle">الوصف الترحيبي</Label>
                <Input
                  id="th-subtitle"
                  placeholder="اطلب الآن والدفع عند الاستلام"
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value.slice(0, 160))}
                  maxLength={160}
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="th-btn">نص الزر</Label>
                <Input
                  id="th-btn"
                  placeholder="تسوق الآن"
                  value={heroButton}
                  onChange={(e) => setHeroButton(e.target.value.slice(0, 30))}
                  maxLength={30}
                  disabled={readOnly}
                />
              </div>
            </div>

            {/* Announcement Bar */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between rounded-xl border border-[#EEEEEE] p-3.5">
                <div>
                  <Label htmlFor="sw-bar" className="cursor-pointer text-sm font-medium">
                    شريط الإعلانات العلوي
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    شريط إشعار أسود أعلى صفحة المتجر قابل للإغلاق.
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
                <div className="space-y-1.5">
                  <Label htmlFor="th-bar">نص شريط الإعلانات</Label>
                  <Input
                    id="th-bar"
                    placeholder="مرحبا بك في متجرنا"
                    value={barText}
                    onChange={(e) => setBarText(e.target.value.slice(0, 80))}
                    maxLength={80}
                    disabled={readOnly}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Landing Sections Manager */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-foreground">أقسام صفحة الهبوط</h3>
              <p className="text-xs text-muted-foreground">
                تحكم في الأقسام المعروضة أسفل المنتجات في صفحة متجرك.
              </p>
            </div>

            {/* 1. FAQ Card */}
            <div className="space-y-4 rounded-2xl border border-[#EEEEEE] bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">الأسئلة الشائعة (FAQ)</p>
                  <p className="text-xs text-muted-foreground">إجابات مختصرة لطمأنة الزبائن قبل الطلب.</p>
                </div>
                <Switch checked={faqEnabled} onCheckedChange={setFaqEnabled} disabled={readOnly} />
              </div>

              {faqEnabled && (
                <div className="space-y-3 pt-2">
                  {faqItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="space-y-2 rounded-xl border border-[#EEEEEE] bg-background/50 p-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          السؤال #{idx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFaqItem(idx)}
                          className="size-7 p-0 text-destructive hover:bg-destructive/10"
                          disabled={readOnly}
                          aria-label="حذف السؤال"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      <Input
                        placeholder="نص السؤال (مثال: شحال ثمن التوصيل؟)"
                        value={item.q}
                        onChange={(e) => updateFaqItem(idx, "q", e.target.value)}
                        maxLength={80}
                        disabled={readOnly}
                      />
                      <Textarea
                        placeholder="نص الإجابة..."
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
                      <Plus className="size-3.5" /> إضافة سؤال جديد ({faqItems.length}/8)
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* 2. Reviews Card */}
            <div className="space-y-4 rounded-2xl border border-[#EEEEEE] bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">تقييمات وآراء العملاء</p>
                  <p className="text-xs text-muted-foreground">
                    تظهر فقط التقييمات التي تقوم بكتابتها بنفسك.
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
                      لم تتم إضافة أي تقييم بعد. انقر أدناه لإضافة أول تقييم لزبائنك.
                    </p>
                  )}

                  {reviewItems.map((rev, idx) => (
                    <div
                      key={idx}
                      className="space-y-2.5 rounded-xl border border-[#EEEEEE] bg-background/50 p-3.5"
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
                              aria-label={`${star} نجوم`}
                            >
                              <Star
                                className={cn(
                                  "size-4",
                                  star <= rev.rating
                                    ? "fill-[#EA580C] text-[#EA580C]"
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
                          aria-label="حذف التقييم"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>

                      <Input
                        placeholder="اسم العميل (مثال: أمين - وهران)"
                        value={rev.name}
                        onChange={(e) => updateReviewItem(idx, "name", e.target.value)}
                        maxLength={60}
                        disabled={readOnly}
                      />

                      <Textarea
                        placeholder="نص التقييم أو تجربة العميل..."
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
                      <Plus className="size-3.5" /> إضافة تقييم جديد ({reviewItems.length}/10)
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* 3. Social Links Card */}
            <div className="space-y-4 rounded-2xl border border-[#EEEEEE] bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">روابط التواصل الاجتماعي</p>
                  <p className="text-xs text-muted-foreground">
                    أزرار دائرية تظهر أسفل صفحة المتجر للوصول لحساباتك.
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
                    <Label htmlFor="so-wa">واتساب</Label>
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
                    <Label htmlFor="so-ig">إنستغرام</Label>
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
                    <Label htmlFor="so-fb">فيسبوك</Label>
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
                    <Label htmlFor="so-tt">تيك توك</Label>
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
            <div className="space-y-4 rounded-2xl border border-[#EEEEEE] bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">شارات الثقة والضمان</p>
                  <p className="text-xs text-muted-foreground">
                    شارات تطمئن المشتري مثل الدفع عند الاستلام والتوصيل.
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
                    const badge = TRUST_BADGES[key];
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
                            ? "border-[#111111] bg-[#111111] text-white"
                            : "border-border bg-card text-muted-foreground hover:border-foreground/50",
                        )}
                      >
                        {active && <Check className="size-3.5" />}
                        <span>{badge.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Preview Column (Sticky on Desktop) */}
        <div className="space-y-6">
          <div className="sticky top-6 space-y-4">
            <div className="overflow-hidden rounded-2xl border border-[#EEEEEE] bg-card shadow-card">
              <div className="flex items-center justify-between border-b bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground">
                <span className="font-medium">معاينة مباشرة</span>
                <span className="rounded-full bg-card px-2.5 py-0.5 text-[11px] font-medium border text-foreground">
                  مباشر
                </span>
              </div>

              {barEnabled && (
                <div className="bg-[#111111] px-3 py-2 text-center text-xs text-white">
                  {barText || "مرحبا بك في متجرنا"}
                </div>
              )}

              <div
                style={previewStyles.hero}
                className="p-6 text-center transition-colors sm:p-8"
              >
                <p className="text-xl font-normal leading-tight">
                  {heroTitle || store?.name || "اسم متجرك"}
                </p>
                <p className="mx-auto mt-2 max-w-xs text-xs font-light opacity-90 leading-relaxed">
                  {heroSubtitle || "اطلب الآن والدفع عند الاستلام"}
                </p>
                <div
                  style={previewStyles.button}
                  className="mt-4 inline-flex h-9 items-center justify-center rounded-full px-6 text-xs font-normal shadow-sm"
                >
                  {heroButton || "تسوق الآن"}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="rounded-2xl border border-[#EEEEEE] bg-card p-5 shadow-card space-y-3">
              <Button
                type="button"
                onClick={() => saveTheme.mutate()}
                disabled={saveTheme.isPending || readOnly}
                className="w-full rounded-full bg-[#111111] text-white hover:bg-[#222222]"
              >
                {saveTheme.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                حفظ التغييرات
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                تطبق التغييرات فوراً على صفحة متجرك للزبائن.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

