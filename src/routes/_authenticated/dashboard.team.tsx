import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { ProLock } from "@/components/dashboard/ProLock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMyStore } from "@/hooks/use-my-store";
import { MAX_TEAM_MEMBERS, MAX_TEAM_USERS, MEMBER_ROLE_LABELS, friendlyError } from "@/lib/commerce";
import { useTr, useUiLanguage } from "@/lib/ui-i18n";

export const Route = createFileRoute("/_authenticated/dashboard/team")({
  component: TeamPage,
});

type Role = "manager" | "agent";

const teamQueryKey = (storeId: string | undefined) => ["team", storeId] as const;

function TeamPage() {
  const t = useTr();
  const { isPro } = useMyStore();
  if (!isPro) {
    return (
      <>
        <PageHeader title={t("فريق العمل")} description={t("أضف من يساعدك في تأكيد الطلبات.")} />
        <ProLock
          title={t("فريق العمل في Pro")}
          description={t("اعمل مع فريقك على نفس المتجر: حتى {n} مستخدمين معك.", { n: MAX_TEAM_USERS })}
          points={[
            t("مدير: يرى كل الطلبات والمنتجات والإحصائيات"),
            t("عون تأكيد: يرى فقط الطلبات المسندة إليه"),
            t("سجل أنشطة يوضح من فعل ماذا ومتى"),
          ]}
        />
      </>
    );
  }
  return <TeamPro />;
}

function TeamPro() {
  const t = useTr();
  const language = useUiLanguage();
  const dir = language === "ar" ? "rtl" : "ltr";
  const locale = language === "ar" ? "ar-DZ" : language === "fr" ? "fr-DZ" : "en-GB";
  const { store, readOnly } = useMyStore();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("agent");

  const members = useQuery({
    queryKey: teamQueryKey(store?.id),
    enabled: !!store,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_members")
        .select("id,email,role,created_at")
        .eq("store_id", store!.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const count = members.data?.length ?? 0;
  const full = count >= MAX_TEAM_MEMBERS;
  const refresh = () => qc.invalidateQueries({ queryKey: ["team"] });

  const add = useMutation({
    mutationFn: async () => {
      const clean = email.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) throw new Error("INVALID_EMAIL");
      const { error } = await supabase.from("store_members").insert({ store_id: store!.id, email: clean, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("تمت إضافة العضو"));
      setEmail("");
      refresh();
    },
    onError: (e: Error) => toast.error(t(friendlyError(e.message, t("تعذرت الإضافة")))),
  });

  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }) => {
      const { error } = await supabase.from("store_members").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("تم تغيير الدور"));
      refresh();
    },
    onError: (e: Error) => toast.error(t(friendlyError(e.message))),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("تمت إزالة العضو"));
      refresh();
    },
    onError: (e: Error) => toast.error(t(friendlyError(e.message))),
  });

  return (
    <>
      <PageHeader
        title={t("فريق العمل")}
        description={t("{used} من {max} مستخدمين (أنت + {count})", { used: count + 1, max: MAX_TEAM_USERS, count })}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <form
          className="h-fit space-y-4 rounded-2xl bg-card p-6 shadow-card"
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate();
          }}
        >
          <h2 className="font-medium">{t("إضافة عضو")}</h2>
          <div className="space-y-1.5">
            <Label htmlFor="memail">{t("البريد الإلكتروني للعضو")}</Label>
            <Input id="memail" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("الدور")}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)} dir={dir}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">{t(MEMBER_ROLE_LABELS.manager)} — {t("كل الطلبات والمنتجات")}</SelectItem>
                <SelectItem value="agent">{t(MEMBER_ROLE_LABELS.agent)} — {t("الطلبات المسندة إليه فقط")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={add.isPending || full || readOnly}>
            {add.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />} {t("إضافة")}
          </Button>
          {full && (
            <p className="text-center text-xs text-muted-foreground">
              {t("وصلت إلى الحد الأقصى: {n} مستخدمين معك.", { n: MAX_TEAM_USERS })}
            </p>
          )}
          <p className="rounded-xl bg-secondary px-4 py-3 text-xs leading-6 text-muted-foreground">
            {t("يسجّل العضو في oranix بنفس هذا البريد ويؤكده، ثم يدخل مباشرة إلى متجرك بالصلاحيات التي اخترتها.")}
          </p>
        </form>

        <div className="rounded-2xl bg-card p-2 shadow-card">
          <ul className="divide-y">
            <li className="flex items-center gap-3 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {(store?.name ?? "؟").slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium" dir="ltr">{store?.owner_email}</p>
                <p className="text-xs text-muted-foreground">{t("صاحب المتجر")}</p>
              </div>
            </li>
            {members.data?.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-orange-soft text-accent-orange">
                  <Users className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium" dir="ltr">{m.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("أضيف في {date}", { date: new Date(m.created_at).toLocaleDateString(locale) })}
                  </p>
                </div>
                <Select
                  value={m.role}
                  onValueChange={(v) => changeRole.mutate({ id: m.id, role: v as Role })}
                  disabled={readOnly}
                  dir={dir}
                >
                  <SelectTrigger className="h-9 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">{t(MEMBER_ROLE_LABELS.manager)}</SelectItem>
                    <SelectItem value="agent">{t(MEMBER_ROLE_LABELS.agent)}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="text-danger" aria-label={t("إزالة")} onClick={() => remove.mutate(m.id)}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
          {count === 0 && !members.isLoading && (
            <p className="p-6 text-center text-sm text-muted-foreground">{t("لم تضف أي عضو بعد.")}</p>
          )}
        </div>
      </div>
    </>
  );
}
