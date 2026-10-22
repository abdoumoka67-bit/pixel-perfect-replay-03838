import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "تعيين كلمة مرور جديدة — oranix" },
      { name: "description", content: "اختر كلمة مرور جديدة لحسابك على oranix." },
      { property: "og:title", content: "تعيين كلمة مرور جديدة — oranix" },
      { property: "og:description", content: "اختر كلمة مرور جديدة لحسابك على oranix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("كلمة المرور يجب أن تحتوي 8 أحرف على الأقل.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error("انتهت صلاحية الرابط. اطلب رابطاً جديداً.");
    toast.success("تم تحديث كلمة المرور.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl bg-card p-8 shadow-card">
        <Logo />
        <h1 className="text-2xl font-bold">كلمة مرور جديدة</h1>
        <div className="space-y-1.5">
          <Label htmlFor="pw">كلمة المرور الجديدة</Label>
          <Input id="pw" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
        </div>
        <Button type="submit" variant="brand" className="w-full" size="lg" disabled={busy}>
          حفظ
        </Button>
      </form>
    </div>
  );
}
