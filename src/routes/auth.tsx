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
  const resetting = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user && !resetting.current) navigate({ to: safePath(redirect), replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // During password reset the code signs the user in before the new password is saved.
      if (event === "SIGNED_IN" && session && !resetting.current) navigate({ to: safePath(redirect), replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, redirect]);

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

  async function googleSignIn() {
    setBusy(true);
    try {
      sessionStorage.setItem("oranix-after-login", safePath(redirect));
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;
    } catch (err) {
      showError(err);
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

              <form onSubmit={submit} className="mt-8 space-y-4">
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

              {mode !== "forgot" && (
                <>
                  <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    {language === "ar" ? "أو" : language === "fr" ? "ou" : "or"}
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <button
                    type="button"
                    onClick={googleSignIn}
                    disabled={busy}
                    className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-[#747775] bg-[#FFFFFF] px-3 text-sm font-medium text-[#1F1F1F] transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.730-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.820z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.310 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.950 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
                    {language === "ar" ? "المتابعة باستخدام Google" : language === "fr" ? "Continuer avec Google" : "Continue with Google"}
                  </button>
                </>
              )}

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
