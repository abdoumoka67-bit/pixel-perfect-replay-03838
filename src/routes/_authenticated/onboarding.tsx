import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { useDocumentLanguage } from "@/components/LanguageSwitcher";
import { translate, type TranslationKey } from "@/lib/i18n";
import {
  DEFAULT_ONBOARDING_INDUSTRIES,
  isValidDzPhone,
  isValidStoreSlug,
  normalizeDzPhone,
  suggestedStoreSlug,
} from "@/lib/commerce";
import { isAdminQuery, myStoreQuery } from "@/hooks/use-my-store";

export const Route = createFileRoute("/_authenticated/onboarding")({
  beforeLoad: async ({ context }) => {
    const store = await context.queryClient.ensureQueryData(myStoreQuery);
    if (!store) return { reviewMode: false };
    // Platform admins may revisit onboarding to review the design; nothing is saved.
    const isAdmin = await context.queryClient.ensureQueryData(isAdminQuery);
    if (!isAdmin) throw redirect({ to: "/dashboard" });
    return { reviewMode: true };
  },
  head: () => ({
    meta: [
      { title: "Create your store — oranix" },
      { name: "description", content: "Choose your store name and link and start your 10-day free trial." },
      { property: "og:title", content: "Create your store — oranix" },
      { property: "og:description", content: "Choose your store name and link and start your free trial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Onboarding,
});

const stepCount = 4;

function storeCreationErrorMessage(error: { code?: string; message: string; details?: string | null }) {
  const diagnostic = `${error.message} ${error.details ?? ""}`.toLowerCase();

  if (diagnostic.includes("invalid_name")) return "The store name must be at least 2 characters.";
  if (diagnostic.includes("invalid_slug")) {
    return "The link can only contain lowercase Latin letters, numbers and dashes.";
  }
  if (error.code === "23505" && diagnostic.includes("slug")) {
    return "This store link is already taken. Choose another one.";
  }
  if (error.code === "23505" && diagnostic.includes("owner_id")) {
    return "This account already has a store. Refresh the page to open it.";
  }
  if (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (diagnostic.includes("column") && diagnostic.includes("does not exist"))
  ) {
    return "The database needs an update: the storefront_config column does not exist yet. The project owner must run migration 20261102000000_storefront_config.sql from the Supabase SQL Editor.";
  }
  if (error.code === "42P01") {
    return "The stores table does not exist in the database. Check that the correct Supabase project is connected.";
  }
  if (error.code === "23502") {
    return `A required store field is missing. Details: ${error.message}`;
  }
  if (error.code === "23503") {
    return "Could not link the store to your account: invalid session. Sign out and sign in again.";
  }
  if (error.code === "42501" || diagnostic.includes("row-level security") || diagnostic.includes("permission denied")) {
    return "The database refused to create the store for this account. Refresh the page and sign in again; if the problem persists, check the RLS policy in Supabase.";
  }

  return `Could not create the store${error.code ? ` (${error.code})` : ""}. Error: ${error.message}`;
}

function Onboarding() {
  const { user, reviewMode } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  // Store setup happens before the store exists, so it stays English-only.
  useDocumentLanguage("en");
  const t = (key: TranslationKey, vars?: Record<string, string | number>) => translate("en", key, vars);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState<string>(DEFAULT_ONBOARDING_INDUSTRIES[0] ?? "");
  const [busy, setBusy] = useState(false);

  const generatedSlug = suggestedStoreSlug(name, user.email ?? null, user.id);
  const effectiveSlug = slugTouched ? slug : generatedSlug;
  const normalizedPhone = normalizeDzPhone(phone);
  const phoneError =
    phone.trim() && !isValidDzPhone(phone)
      ? t("onb.phoneError")
      : null;
  const phoneOk = isValidDzPhone(phone);

  const canContinueFromStep = () => {
    if (step === 0) return Boolean(user?.email || user?.phone);
    if (step === 1) return Boolean(fullName.trim() && name.trim() && isValidStoreSlug(effectiveSlug));
    if (step === 2) return isValidDzPhone(phone);
    return Boolean(industry);
  };

  const nextStep = () => {
    if (step < stepCount - 1) setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => Math.max(0, s - 1));

  async function submit() {
    if (name.trim().length < 2) {
      toast.error(t("onb.err.name"));
      return;
    }
    const safeSlug = effectiveSlug.trim().toLowerCase();
    if (!isValidStoreSlug(safeSlug)) {
      toast.error(t("onb.err.slug"));
      return;
    }
    if (!isValidDzPhone(phone)) {
      toast.error(t("onb.err.phone"));
      return;
    }
    if (reviewMode) {
      toast.success(t("onb.review"));
      await navigate({ to: "/dashboard" });
      return;
    }
    setBusy(true);
    // Every store sells physical products paid on delivery, so the product type is
    // fixed and the industry is kept with the storefront settings.
    const payload = {
      owner_id: user.id,
      name: name.trim(),
      slug: safeSlug,
      phone: normalizedPhone || null,
      whatsapp: normalizedPhone || null,
      storefront_config: {
        product_type: "physical",
        industry,
        currency: "DZD",
      },
    };

    let storeCreated = false;
    try {
      const { error } = await supabase.from("stores").insert(payload);
      if (error) {
        console.error("Store creation failed", error);
        const diagnostic = `${error.message} ${error.details ?? ""}`.toLowerCase();
        // A uniqueness clash on owner_id means the store already exists (for
        // example after a double submit or a retry): open it instead of getting stuck.
        const alreadyOwnsStore =
          error.message?.includes("owner_id") ||
          (error.code === "23505" && !diagnostic.includes("slug"));
        if (alreadyOwnsStore) {
          toast.info(t("onb.alreadyHave"));
          await qc.fetchQuery({ ...myStoreQuery, staleTime: 0 });
          await navigate({ to: "/dashboard", replace: true });
          return;
        }
        toast.error(storeCreationErrorMessage(error));
        return;
      }

      storeCreated = true;
      const { error: profileError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });
      if (profileError) {
        console.error("Saving onboarding profile failed", profileError);
        toast.error(t("onb.profileFail"));
      }

      // Prime the cache with the new store before leaving so the dashboard guard
      // does not mistake a slow read for "no store" and bounce back here.
      await qc.fetchQuery({ ...myStoreQuery, staleTime: 0 });
      toast.success(t("onb.created"));
      await navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      console.error("Store creation flow failed", error);
      toast.error(
        storeCreated
          ? t("onb.openFail")
          : t("onb.netFail"),
      );
    } finally {
      setBusy(false);
    }
  }

  const renderStep = () => {
    if (step === 0) {
      return (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="account-contact">{user.email ? t("onb.email") : t("onb.phone")}</Label>
            <Input id="account-contact" value={user.email ?? user.phone ?? ""} readOnly className="h-11 bg-muted" />
          </div>
          <div className="rounded-2xl border border-success/20 bg-success-soft p-4 text-sm text-muted-foreground">
            {user.email
              ? t("onb.confirmedEmail")
              : t("onb.confirmedOther")}
          </div>
          <div className="flex gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm leading-6 text-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={1.8} />
            <p>{t("onb.security")}</p>
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="full-name">{t("onb.fullName")}</Label>
            <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("onb.fullNamePh")} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="store-name">{t("onb.storeName")}</Label>
            <Input id="store-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("onb.storeNamePh")} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">{t("onb.slug")}</Label>
            <div className="flex h-11 items-center overflow-hidden rounded-xl border border-input bg-card focus-within:ring-2 focus-within:ring-ring/50" dir="ltr">
              <span className="border-e bg-muted px-3 py-2.5 text-sm text-muted-foreground">oranix.app/m/</span>
              <input
                id="slug"
                className="h-full flex-1 bg-transparent px-3 text-sm outline-none"
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                placeholder="lina-store"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("onb.slugHint")}
            </p>
            <div className="rounded-2xl border border-dashed border-border bg-white p-4 text-sm text-muted-foreground">
              {t("onb.domainHint")}
            </div>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("onb.whatsapp")}</Label>
            <Input id="phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0550 00 00 00" className="h-11" aria-invalid={Boolean(phoneError)} />
            {phoneError ? (
              <p className="text-xs text-destructive">{phoneError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("onb.phoneHint")}</p>
            )}
          </div>
          {phoneOk && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-success/20 bg-success-soft p-4 text-sm leading-6 text-success">
              <ShieldCheck className="size-5 shrink-0" strokeWidth={1.8} />
              <span>{t("onb.phoneOk")}</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>{t("onb.industry")}</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEFAULT_ONBOARDING_INDUSTRIES.map((item, idx) => (
              <button
                key={item}
                type="button"
                onClick={() => setIndustry(item)}
                className={[
                  "rounded-2xl border px-3 py-2.5 text-right transition-all",
                  industry === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground",
                ].join(" ")}
              >
                {idx < 5 ? t(`onb.ind.${idx}` as TranslationKey) : item}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const currentTitle = t(`onb.title.${step}` as TranslationKey);

  const currentSubtitle = t(`onb.sub.${step}` as TranslationKey);

  const isLast = step === stepCount - 1;

  return (
    <div className="flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-background px-4 py-8">
      <div className="w-full min-w-0 max-w-xl rounded-[28px] border border-border bg-white p-5 shadow-[0_0_0_1px_rgba(17,17,17,0.02),0_18px_50px_-20px_rgba(0,0,0,0.25)] sm:p-9">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="mt-6 space-y-2.5">
          <nav className="flex items-center gap-1.5" aria-label="Store setup progress">
            {Array.from({ length: stepCount }).map((_, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => idx < step && setStep(idx)}
                disabled={idx >= step || busy}
                aria-current={idx === step ? "step" : undefined}
                aria-label={t(`onb.title.${idx}` as TranslationKey)}
                className={[
                  "h-1.5 flex-1 rounded-full transition-colors disabled:cursor-default",
                  idx <= step
                    ? "bg-primary"
                    : "bg-[repeating-linear-gradient(90deg,#EEEEEE_0_6px,transparent_6px_10px)]",
                ].join(" ")}
              />
            ))}
          </nav>
          <p className="text-center text-xs text-muted-foreground num">{t("onb.step", { n: step + 1, total: stepCount })}</p>
        </div>

        <div className="mt-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-xs text-brand">
            <Sparkles className="size-3.5" /> {t("onb.trial")}
          </span>
          <h1 className="mt-4 text-3xl font-medium text-primary">{currentTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{currentSubtitle}</p>
        </div>

        <div className="mt-8">{renderStep()}</div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => (step === 0 ? navigate({ to: "/" }) : prevStep())}
            disabled={busy}
            aria-label={t("common.back")}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          </button>

          {isLast ? (
            <Button onClick={submit} disabled={busy || !canContinueFromStep()} variant="brand" className="h-10 shrink-0 rounded-full px-5 text-sm">
              {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck className="size-4" />} {t("onb.finish")}
            </Button>
          ) : (
            <Button onClick={nextStep} disabled={!canContinueFromStep()} variant="brand" className="h-10 shrink-0 rounded-full px-5 text-sm">
              {t(`onb.next.${step}` as TranslationKey)}
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
