import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { friendlyError, isValidStoreSlug, slugify } from "@/lib/commerce";
import { myStoreQuery } from "@/hooks/use-my-store";

export const Route = createFileRoute("/_authenticated/onboarding")({
  beforeLoad: async ({ context }) => {
    const store = await context.queryClient.ensureQueryData(myStoreQuery);
    if (store) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "أنشئ متجرك — oranix" },
      { name: "description", content: "اختر اسم ورابط متجرك وابدأ تجربتك المجانية لمدة 7 أيام." },
      { property: "og:title", content: "أنشئ متجرك — oranix" },
      { property: "og:description", content: "اختر اسم ورابط متجرك وابدأ تجربتك المجانية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const effectiveSlug = slugTouched ? slug : slugify(name) || slug;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidStoreSlug(effectiveSlug)) {
      { toast.error("الرابط يجب أن يكون 3 أحرف على الأقل: حروف لاتينية صغيرة وأرقام وشرطات."); return; }
    }
    setBusy(true);
    const { error } = await supabase.from("stores").insert({
      owner_id: user.id,
      name: name.trim(),
      slug: effectiveSlug,
      phone: phone || null,
      whatsapp: phone || null,
    });
    setBusy(false);
    if (error) { toast.error(friendlyError(error.message, "تعذر إنشاء المتجر.")); return; }
    await qc.invalidateQueries({ queryKey: ["my-store"] });
    toast.success("تم إنشاء متجرك! بدأت تجربتك المجانية لمدة 7 أيام.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-5 py-10">
      <form onSubmit={submit} className="w-full max-w-lg space-y-6 rounded-3xl bg-card p-7 shadow-float sm:p-10">
        <Logo />
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            <Sparkles className="size-3.5" /> 7 أيام مجاناً بكل الميزات
          </span>
          <h1 className="mt-3 text-3xl font-bold">لنُنشئ متجرك</h1>
          <p className="mt-1 text-muted-foreground">يمكنك تعديل هذه المعلومات لاحقاً من الإعدادات.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">اسم المتجر</Label>
          <Input id="name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: Lina Shop" className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">رابط المتجر</Label>
          <div className="flex h-11 items-center overflow-hidden rounded-md border border-input bg-card focus-within:ring-2 focus-within:ring-ring/50" dir="ltr">
            <span className="border-e bg-muted px-3 py-2.5 text-sm text-muted-foreground">oranix/m/</span>
            <input
              id="slug"
              className="h-full flex-1 bg-transparent px-3 text-sm outline-none"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              placeholder="lina-shop"
            />
          </div>
          <p className="text-xs text-muted-foreground">حروف لاتينية صغيرة وأرقام وشرطات فقط.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">رقم الهاتف / واتساب (اختياري)</Label>
          <Input id="phone" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0550 00 00 00" className="h-11" />
        </div>
        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} إنشاء المتجر
        </Button>
      </form>
    </div>
  );
}
