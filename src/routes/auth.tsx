import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { LanguageMenu, useDocumentLanguage, usePublicLanguage } from "@/components/LanguageSwitcher";
import { translate, type TranslationKey } from "@/lib/i18n";
import { useAccountTheme } from "@/hooks/use-account-theme";

const search = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
  email: z.string().optional(),
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
  // Never send a signed-in person back to marketing or the sign-in page.
  if (!p || p === "/" || p === "/auth" || !p.startsWith("/") || p.startsWith("//")) {
    return "/dashboard";
  }
  return p;
}

const RESEND_SECONDS = 60;

// Where an OAuth round trip should land after Supabase sends the visitor back.
const AUTH_REDIRECT_KEY = "oranix_auth_redirect";

function AuthPage() {
  const { redirect, mode: initialMode, email: initialEmail } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  // Public pages open in French by default; the visitor can switch language.
  const { language, setLanguage } = usePublicLanguage("fr");
  const isRtl = language === "ar";
  useDocumentLanguage(language);
  useAccountTheme();
  const t = (key: TranslationKey, vars?: Record<string, string | number>) => translate(language, key, vars);
  const [mode, setMode] = useState<"signin" | "signup">(initialMode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // The user is entering the account-confirmation code.
  const [step, setStep] = useState<null | "confirm">(null);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  // Render the Google button with the page from the first paint so the form
  // never shifts, then hide it only if Supabase explicitly reports Google is off.
  const [googleEnabled, setGoogleEnabled] = useState(true);

  useEffect(() => {
    // Supabase puts the session in the URL (access_token) or hands back a code,
    // and the client finishes restoring it a moment later. Check the stored
    // session first, then wait for the sign-in event while the exchange is in flight.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    if (hash.get("error") || query.get("error")) return;

    let active = true;
    const finish = () => {
      if (!active) return;
      const savedTarget = sessionStorage.getItem(AUTH_REDIRECT_KEY);
      sessionStorage.removeItem(AUTH_REDIRECT_KEY);
      void qc.invalidateQueries({ queryKey: ["my-store"] });
      void navigate({ to: safePath(savedTarget || redirect), replace: true });
    };

    const hasAuthParams =
      window.location.hash.includes("access_token") || window.location.search.includes("code=");

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish();
    });

    // Only listen while an OAuth round trip is pending, so a normal password or
    // OTP sign-in does not race the redirect it already performs itself.
    if (!hasAuthParams) {
      // A marker left over from an abandoned provider attempt (Google lands on
      // /dashboard, so /auth never consumes it) would hijack the next email or
      // OTP sign-in, so drop it once we know no exchange is in flight.
      sessionStorage.removeItem(AUTH_REDIRECT_KEY);
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) finish();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, qc, redirect]);

  // Only offer Google when it is switched on for this project.
  useEffect(() => {
    const url = import.meta.env["VITE_SUPABASE_URL"];
    const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return;
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { external?: { google?: boolean } } | null) => {
        // Only hide on a definitive "disabled" answer, so a slow network never
        // makes the button pop in late.
        if (d) setGoogleEnabled(d.external?.google === true);
      })
      .catch(() => {
        // Keep the button visible; the sign-in flow itself reports any real error.
      });
  }, []);

  // Show provider errors that Supabase passes back in the URL after the Google redirect.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const error = hash.get("error") || query.get("error");
    if (!error) return;
    const description = hash.get("error_description") || query.get("error_description");
    // A cancelled/failed Google attempt must not leave a pending sign-in marker.
    sessionStorage.removeItem(AUTH_REDIRECT_KEY);
    toast.error(description?.replace(/\+/g, " ") || translate(language, "auth.err.google"));
    window.history.replaceState({}, "", window.location.pathname);
  }, [language]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function openCodeStep() {
    setCode("");
    setStep("confirm");
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

  async function signInWithEmail() {
    const normalizedEmail = email.trim();
    setEmail(normalizedEmail);
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) {
      if (/email not confirmed/i.test(error.message)) {
        const { error: resendError } = await supabase.auth.resend({ type: "signup", email: normalizedEmail });
        if (resendError) throw resendError;
        toast.info(t("auth.ok.unconfirmed"));
        openCodeStep();
        return;
      }
      throw error;
    }
    // Fresh session: drop the cached store so the dashboard loads the right one.
    await qc.invalidateQueries({ queryKey: ["my-store"] });
    navigate({ to: safePath(redirect), replace: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithEmail();
      } else if (mode === "signup") {
        if (password.length < 8) throw new Error(t("auth.err.password"));
        const normalizedEmail = email.trim();
        setEmail(normalizedEmail);
        const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password });
        if (error) {
          if (/already registered/i.test(error.message)) {
            setMode("signin");
            await signInWithEmail();
            return;
          }
          throw error;
        }
        if (data.session) {
          await qc.invalidateQueries({ queryKey: ["my-store"] });
          await navigate({ to: "/dashboard", replace: true });
        } else if (data.user?.identities?.length === 0) {
          setMode("signin");
          await signInWithEmail();
        } else if (data.user) openCodeStep();
        else throw new Error("Sign-up did not return a user.");
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
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (error) throw error;
      toast.success(t("auth.ok.confirmed"));

      // Check the fresh session directly: a registered account goes straight to
      // the dashboard, while a brand-new account continues to store setup.
      const { data: storeAccess, error: accessError } = await supabase.rpc("my_store_access");
      if (accessError) throw accessError;
      if (storeAccess && storeAccess.length > 0) {
        await qc.invalidateQueries({ queryKey: ["my-store"] });
        await navigate({ to: "/dashboard", replace: true });
      } else {
        await navigate({ to: "/onboarding", replace: true });
      }
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (cooldown > 0) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
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
    // Remember where the provider should land, and send Supabase back to the
    // dashboard: the guarded route restores the session before it renders.
    const redirectTo = `${window.location.origin}/dashboard`;
    sessionStorage.setItem(AUTH_REDIRECT_KEY, "/dashboard");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
    if (error) {
      sessionStorage.removeItem(AUTH_REDIRECT_KEY);
      toast.error(t("auth.err.google"));
    }
  }

  return (
    <div className="theme-forest flex min-h-screen flex-col bg-background px-6 py-8 sm:px-12" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            aria-label={t("common.back")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <LanguageMenu compact value={language} onChange={setLanguage} />
      </div>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        {step ? (
          <div>
            <div className="flex size-14 items-center justify-center rounded-full bg-accent-orange-soft text-accent-orange">
              <MailCheck className="size-7" />
            </div>
            <h1 className="mt-5 text-2xl font-medium">{t("auth.code.titleConfirm")}</h1>
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
              <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                {t("auth.code.confirm")}
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
            {mode === "signin" && (
              <div>
                <h1 className="text-3xl font-medium">{t("auth.title.signin")}</h1>
                <p className="mt-2 text-muted-foreground">{t("auth.sub.signin")}</p>
              </div>
            )}

            {googleEnabled && (
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

            <form onSubmit={submit} className={googleEnabled ? "mt-6 space-y-4" : "mt-8 space-y-4"}>
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input id="password" type="password" dir="ltr" required minLength={mode === "signup" ? 8 : 1} autoFocus={Boolean(initialEmail)} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
              </div>
              <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                {mode === "signin" ? t("auth.signin") : t("auth.signup")}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>{t("auth.noAccount")} <button className="font-medium text-brand hover:underline" onClick={() => setMode("signup")}>{t("auth.createFree")}</button></>
              ) : (
                <>{t("auth.haveAccount")} <button className="font-medium text-brand hover:underline" onClick={() => setMode("signin")}>{t("auth.signinLink")}</button></>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
