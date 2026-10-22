import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";

const search = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — oranix" },
      { name: "description", content: "ادخل إلى لوحة تحكم متجرك على oranix أو أنشئ حساباً جديداً مع تجربة مجانية 7 أيام." },
      { property: "og:title", content: "تسجيل الدخول — oranix" },
      { property: "og:description", content: "ادخل إلى لوحة تحكم متجرك على oranix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function safePath(p?: string) {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/dashboard";
}

function AuthPage() {
  const { redirect, mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<null | "confirm" | "reset">(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: safePath(redirect), replace: true });
    });
  }, [navigate, redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: safePath(redirect), replace: true });
      } else if (mode === "signup") {
        if (password.length < 8) throw new Error("كلمة المرور يجب أن تحتوي 8 أحرف على الأقل.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/dashboard", replace: true });
        else setSent("confirm");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("reset");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Invalid login")) toast.error("البريد أو كلمة المرور غير صحيحة.");
      else if (msg.includes("already registered")) toast.error("هذا البريد مسجل مسبقاً. سجّل الدخول.");
      else if (msg.includes("Email not confirmed")) toast.error("أكّد بريدك الإلكتروني أولاً من الرسالة التي وصلتك.");
      else toast.error(msg || "حدث خطأ، حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const target = safePath(redirect);
    sessionStorage.setItem("oranix:after-login", target);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}` },
    });
    if (error) toast.error("تسجيل الدخول عبر Google غير متاح حالياً.");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link to="/" className="self-start">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <MailCheck className="size-7" />
              </div>
              <h1 className="mt-5 text-2xl font-bold">تحقق من بريدك</h1>
              <p className="mt-2 text-muted-foreground">
                {sent === "confirm"
                  ? "أرسلنا رابط تأكيد إلى بريدك. افتحه لتفعيل حسابك وبدء تجربتك المجانية."
                  : "أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك."}
              </p>
              <Button variant="outline" className="mt-6" onClick={() => { setSent(null); setMode("signin"); }}>
                العودة لتسجيل الدخول
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold">
                {mode === "signin" ? "مرحباً بعودتك" : mode === "signup" ? "أنشئ متجرك في دقيقة" : "نسيت كلمة المرور؟"}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {mode === "signup"
                  ? "7 أيام تجربة مجانية بكل الميزات، بدون بطاقة دفع."
                  : mode === "signin"
                    ? "ادخل إلى لوحة تحكم متجرك."
                    : "اكتب بريدك وسنرسل لك رابطاً لإعادة تعيينها."}
              </p>

              {mode !== "forgot" && (
                <>
                  <Button type="button" variant="outline" size="lg" className="mt-8 w-full" onClick={google}>
                    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                      <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z" />
                      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8C3.9 20.6 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.8 14.2c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V7H2.1C1.4 8.5 1 10.2 1 12s.4 3.5 1.1 5l3.7-2.8z" />
                      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.5 2.1 15 1 12 1 7.7 1 3.9 3.4 2.1 7l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
                    </svg>
                    المتابعة عبر Google
                  </Button>
                  <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" /> أو بالبريد الإلكتروني <span className="h-px flex-1 bg-border" />
                  </div>
                </>
              )}

              <form onSubmit={submit} className={mode === "forgot" ? "mt-8 space-y-4" : "space-y-4"}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input id="email" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
                </div>
                {mode !== "forgot" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">كلمة المرور</Label>
                      {mode === "signin" && (
                        <button type="button" className="text-xs text-brand hover:underline" onClick={() => setMode("forgot")}>
                          نسيت كلمة المرور؟
                        </button>
                      )}
                    </div>
                    <Input id="password" type="password" dir="ltr" required minLength={mode === "signup" ? 8 : 1} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
                  </div>
                )}
                <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {mode === "signin" ? "تسجيل الدخول" : mode === "signup" ? "إنشاء الحساب" : "إرسال الرابط"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signin" ? (
                  <>ليس لديك حساب؟ <button className="font-semibold text-brand hover:underline" onClick={() => setMode("signup")}>أنشئ متجرك مجاناً</button></>
                ) : (
                  <>لديك حساب؟ <button className="font-semibold text-brand hover:underline" onClick={() => setMode("signin")}>سجّل الدخول</button></>
                )}
              </p>
            </>
          )}
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-sidebar lg:block">
        <div className="absolute inset-0 bg-hero opacity-20" />
        <div className="relative flex h-full flex-col justify-end p-12 text-sidebar-foreground">
          <p className="font-display text-4xl font-bold leading-tight">
            استقبل طلبات <span className="text-sidebar-primary">الدفع عند الاستلام</span>
            <br /> من 58 ولاية، بلا تعقيد.
          </p>
          <p className="mt-4 max-w-md text-sidebar-muted">
            صفحات هبوط سريعة لإعلانات تيك توك وإنستغرام، تأكيد هاتفي منظم، وإرسال مباشر إلى Yalidine.
          </p>
        </div>
      </div>
    </div>
  );
}
