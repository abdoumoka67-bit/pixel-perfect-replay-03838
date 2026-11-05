import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, PlugZap, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useMyStore } from "@/hooks/use-my-store";
import { useTranslatedMessage, useTr } from "@/lib/ui-i18n";
import { testYalidineConnection } from "@/lib/yalidine.functions";

export const Route = createFileRoute("/_authenticated/dashboard/yalidine")({
  component: YalidinePage,
});

function YalidinePage() {
  const t = useTr();
  const msg = useTranslatedMessage();
  const { store } = useMyStore();
  const qc = useQueryClient();
  const testFn = useServerFn(testYalidineConnection);
  const [apiId, setApiId] = useState("");
  const [apiToken, setApiToken] = useState("");

  const creds = useQuery({
    queryKey: ["yalidine", store?.id],
    enabled: !!store,
    queryFn: async () => {
      const { data, error } = await supabase.from("yalidine_credentials").select("*").eq("store_id", store!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (creds.error) {
      toast.error(t("تعذر تحميل بيانات ربط Yalidine."));
      return;
    }
    if (creds.data) {
      setApiId(creds.data.api_id);
      setApiToken(creds.data.api_token);
    }
  }, [creds.data, creds.error, t]);

  const save = useMutation({
    mutationFn: async () => {
      if (apiId.trim().length < 3 || apiToken.trim().length < 3) throw new Error(t("أدخل API ID و API Token"));
      const { error } = await supabase
        .from("yalidine_credentials")
        .upsert({ store_id: store!.id, api_id: apiId.trim(), api_token: apiToken.trim() });
      if (error) throw new Error(t("تعذر الحفظ"));
    },
    onSuccess: () => {
      toast.success(t("تم حفظ مفاتيح Yalidine"));
      qc.invalidateQueries({ queryKey: ["yalidine"] });
    },
    onError: (e: Error) => toast.error(t(e.message)),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("yalidine_credentials").delete().eq("store_id", store!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setApiId("");
      setApiToken("");
      toast.success(t("تم فصل حساب Yalidine"));
      qc.invalidateQueries({ queryKey: ["yalidine"] });
    },
    onError: () => toast.error(t("تعذر فصل حساب Yalidine.")),
  });

  const test = useMutation({
    mutationFn: () => testFn({ data: { api_id: apiId.trim(), api_token: apiToken.trim() } }),
    onSuccess: (r) => (r.ok ? toast.success(msg(r.message)) : toast.error(msg(r.message))),
    onError: () => toast.error(t("أدخل المفاتيح أولاً")),
  });

  return (
    <>
      <PageHeader
        title={t("ربط Yalidine Express")}
        description={t("أرسل الطلبات المؤكدة مباشرة إلى Yalidine واحصل على رقم التتبع تلقائياً.")}
      />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <form
          className="space-y-5 rounded-2xl bg-card p-6 shadow-card"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{t("مفاتيح الربط")}</h2>
            {creds.data ? (
              <Badge variant="success">
                <CheckCircle2 className="size-3" /> {t("مربوط")}
              </Badge>
            ) : (
              <Badge variant="neutral">{t("غير مربوط")}</Badge>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apiid">API ID</Label>
            <Input id="apiid" dir="ltr" value={apiId} onChange={(e) => setApiId(e.target.value)} autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apitoken">API Token</Label>
            <Input id="apitoken" type="password" dir="ltr" value={apiToken} onChange={(e) => setApiToken(e.target.value)} autoComplete="off" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="brand" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} {t("حفظ")}
            </Button>
            <Button type="button" variant="outline" disabled={test.isPending} onClick={() => test.mutate()}>
              {test.isPending ? <Loader2 className="animate-spin" /> : <PlugZap />} {t("اختبار الاتصال")}
            </Button>
            {creds.data && (
              <Button type="button" variant="ghost" className="text-danger" disabled={remove.isPending} onClick={() => remove.mutate()}>
                <Trash2 /> {t("فصل الحساب")}
              </Button>
            )}
          </div>
        </form>
        <div className="rounded-2xl bg-sidebar p-6 text-sidebar-foreground shadow-card">
          <h2 className="font-medium">{t("كيف تحصل على المفاتيح؟")}</h2>
          <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-sidebar-muted">
            <li>{t("ادخل إلى حسابك في Yalidine.")}</li>
            <li>{t("افتح قسم «الإعدادات» ثم «API / المطوّرين».")}</li>
            <li>{t("انسخ API ID و API Token والصقهما هنا.")}</li>
            <li>{t("اضغط «اختبار الاتصال» للتأكد.")}</li>
          </ol>
          <p className="mt-5 text-xs text-sidebar-muted">
            {t("ولاية الإرسال تُحدَّد من «إعدادات المتجر». مفاتيحك مرئية لك فقط ولا يطّلع عليها أي تاجر آخر.")}
          </p>
        </div>
      </div>
    </>
  );
}
