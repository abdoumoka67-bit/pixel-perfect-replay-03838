import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { LanguageMenu, useDocumentLanguage, usePublicLanguage } from "@/components/LanguageSwitcher";
import { translate, type TranslationKey } from "@/lib/i18n";

const search = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Sign in — oranix" },
      { name: "description", content: "Sign in to your oranix store dashboard or create a new account with a 7-day free trial." },
      { property: "og:title", content: "Sign in — oranix" },
      { property: "og:description", content: "Sign in to your oranix store dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function safePath(p?: string) {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/dashboard";
}

const RESEND_SECONDS = 60;

function AuthPage() {
  const { redirect, mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  // Public pages open in English by default; the visitor can switch language.
  const { language, setLanguage } = usePublicLanguage("en");
  const isRtl = language === "ar";
  useDocumentLanguage(language);
  const t = (key: TranslationKey, vars?: Record<string, string | number>) => translate(language, key, vars);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // Which code the user is entering: account confirmation or password reset.
  const [step, setStep] = useState<null | "confirm" | "reset">(null);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const resetting = useRef(false);

  useEffect(() => {
    // Land on the page the visitor originally wanted, otherwise the dashboard.
    const stored = sessionStorage.getItem("oranix:after-login") ?? undefined;
    const target = safePath(redirect || stored || undefined);
    const go = () => {
      sessionStorage.removeItem("oranix:after-login");
      navigate({ to: target, replace: true });
    };
    // Do not enter the dashboard just because a session already exists;
    // only navigate after an explicit sign-in (password, code, or Google).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // During password reset the code signs the user in before the new password is saved.
      if (event === "SIGNED_IN" && session && !resetting.current) go();
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, redirect]);

  // Only offer Google when it is switched on for this project.
  useEffect(() => {
    const url = import.meta.env["VITE_SUPABASE_URL"];
    const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return;
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { external?: { google?: boolean } } | null) => {
        setGoogleEnabled(Boolean(d?.external?.google));
      })
      .catch(() => {
        setGoogleEnabled(false);
      });
  }, []);

  // Show provider errors that Supabase passes back in the URL after the Google redirect.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const error = hash.get("error") || query.get("error");
    if (!error) return;
    const description = hash.get("error_description") || query.get("error_description");
    toast.error(description?.replace(/\+/g, " ") || translate(language, "auth.err.google"));
    window.history.replaceState({}, "", window.location.pathname);
  }, [language]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function openCodeStep(kind: "confirm" | "reset") {
    setCode("");
    setNewPassword("");
    setStep(kind);
    setCooldown(RESEND_SECONDS);
  }

  function showError(err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Invalid login")) toast.error(t("auth.err.invalidLogin"));
    else if (msg.includes("already registered")) toast.error(t("auth.err.registered"));
    else if (/sms provider|phone.*not enabled|phone.*disabled|unsupported phone/i.test(msg))
      toast.error(t("auth.err.sms"));
    else if (/expired|invalid/i.test(msg) && step) toast.error(t("auth.err.code"));
    else if (/rate limit|security purposes/i.test(msg)) toast.error(t("auth.err.rate"));
    else toast.error(msg || t("auth.err.generic"));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes("Email not confirmed")) {
            const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
            if (resendError) throw resendError;
            toast.info(t("auth.ok.unconfirmed"));
            openCodeStep("confirm");
            return;
          }
          throw error;
        }
        navigate({ to: safePath(redirect), replace: true });
      } else if (mode === "signup") {
        if (password.length < 8) throw new Error(t("auth.err.password"));
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) navigate({ to: "/dashboard", replace: true });
        else openCodeStep("confirm");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        openCodeStep("reset");
      }
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) {
      toast.error(t("auth.err.codeEmail"));
      return;
    }
    if (step === "reset" && newPassword.length < 8) { toast.error(t("auth.err.password")); return; }
    setBusy(true);
    try {
      if (step === "confirm") {
        const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
        if (error) throw error;
        toast.success(t("auth.ok.confirmed"));
        navigate({ to: safePath(redirect), replace: true });
      } else {
        resetting.current = true;
        const { error } = await supabase.auth.verifyOtp({ email, token, type: "recovery" });
        if (error) throw error;
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) throw updateError;
        resetting.current = false;
        toast.success(t("auth.ok.passwordUpdated"));
        navigate({ to: safePath(redirect), replace: true });
      }
    } catch (err) {
      resetting.current = false;
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (cooldown > 0) return;
    setBusy(true);
    try {
      const { error } =
        step === "confirm"
          ? await supabase.auth.resend({ type: "signup", email })
          : await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      toast.success(t("auth.ok.resent"));
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    sessionStorage.setItem("oranix:after-login", safePath(redirect));
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth`,
        // Always let the visitor pick which Google account to use.
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) toast.error(t("auth.err.google"));
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between gap-3">
          <Link to="/">
            <Logo />
          </Link>
          <LanguageMenu compact value={language} onChange={setLanguage} />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {step ? (
            <div>
              <div className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
                <MailCheck className="size-7" />
              </div>
              <h1 className="mt-5 text-2xl font-medium">
                {step === "confirm" ? t("auth.code.titleConfirm") : t("auth.code.titleReset")}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {t("auth.code.sentEmail")} <span dir="ltr" className="font-medium text-foreground">{email}</span>. {t("auth.code.spam")}
              </p>

              <form onSubmit={verify} className="mt-8 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code">{t("auth.code.label")}</Label>
                  <Input
                    id="code"
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={8}
                    placeholder="••••••"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    className="h-14 text-center text-2xl tracking-[0.5em]"
                  />
                </div>
                {step === "reset" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">{t("auth.code.newPassword")}</Label>
                    <Input id="new-password" type="password" dir="ltr" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-11" />
                  </div>
                )}
                <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {step === "reset" ? t("auth.code.savePassword") : t("auth.code.confirm")}
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-between text-sm">
                <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => { setStep(null); setMode("signin"); }}>
                  {t("auth.backToSignin")}
                </button>
                <button
                  type="button"
                  className="font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                  disabled={cooldown > 0 || busy}
                  onClick={resend}
                >
                  {cooldown > 0 ? t("auth.code.resendIn", { n: cooldown }) : t("auth.code.resend")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-medium">
                {mode === "signin" ? t("auth.title.signin") : mode === "signup" ? t("auth.title.signup") : t("auth.title.forgot")}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {mode === "signup"
                  ? t("auth.sub.signup")
                  : mode === "signin"
                    ? t("auth.sub.signin")
                    : t("auth.sub.forgot")}
              </p>

              {mode !== "forgot" && googleEnabled && (
                <>
                  <Button type="button" variant="outline" size="lg" className="mt-8 w-full" onClick={google}>
                    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                      <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z" />
                      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8C3.9 20.6 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.8 14.2c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V7H2.1C1.4 8.5 1 10.2 1 12s.4 3.5 1.1 5l3.7-2.8z" />
                      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.5 2.1 15 1 12 1 7.7 1 3.9 3.4 2.1 7l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
                    </svg>
                    {t("auth.google")}
                  </Button>
                  <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" /> {t("auth.or")} <span className="h-px flex-1 bg-border" />
                  </div>
                </>
              )}

              <form onSubmit={submit} className={mode !== "forgot" && googleEnabled ? "mt-6 space-y-4" : "mt-8 space-y-4"}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input id="email" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
                </div>
                {mode !== "forgot" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">{t("auth.password")}</Label>
                      {mode === "signin" && (
                        <button type="button" className="text-xs text-brand hover:underline" onClick={() => setMode("forgot")}>
                          {t("auth.forgotLink")}
                        </button>
                      )}
                    </div>
                    <Input id="password" type="password" dir="ltr" required minLength={mode === "signup" ? 8 : 1} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
                  </div>
                )}
                <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {mode === "forgot"
                    ? t("auth.sendResetCode")
                    : mode === "signin"
                      ? t("auth.signin")
                      : t("auth.signup")}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signin" ? (
                  <>{t("auth.noAccount")} <button className="font-medium text-brand hover:underline" onClick={() => setMode("signup")}>{t("auth.createFree")}</button></>
                ) : (
                  <>{t("auth.haveAccount")} <button className="font-medium text-brand hover:underline" onClick={() => setMode("signin")}>{t("auth.signinLink")}</button></>
                )}
              </p>
              {mode === "forgot" && (
                <button type="button" className="mt-4 w-full text-center text-sm text-brand hover:underline" onClick={() => setMode("signin")}>
                  {t("auth.backToSignin")}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-sidebar lg:block">
        <div className="absolute inset-0 bg-hero opacity-20" />
        <div className="relative flex h-full flex-col justify-end p-12 text-sidebar-foreground">
          <p className="font-display text-4xl font-medium leading-tight">
            {t("auth.side.title1")} <span className="text-sidebar-primary">{t("auth.side.title2")}</span>
            <br /> {t("auth.side.title3")}
          </p>
          <p className="mt-4 max-w-md text-sidebar-muted">
            {t("auth.side.body")}
          </p>
        </div>
      </div>
    </div>
  );
}
