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
import { testYalidineConnection } from "@/lib/yalidine.functions";

export const Route = createFileRoute("/_authenticated/dashboard/yalidine")({
  component: YalidinePage,
});

function YalidinePage() {
  const { store } = useMyStore();
  const qc = useQueryClient();
  const testFn = useServerFn(testYalidineConnection);
  const [apiId, setApiId] = useState("");
  const [apiToken, setApiToken] = useState("");

  const creds = useQuery({
    queryKey: ["yalidine", store?.id],
    enabled: !!store,
    queryFn: async () => {
      const { data } = await supabase.from("yalidine_credentials").select("*").eq("store_id", store!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (creds.data) {
      setApiId(creds.data.api_id);
      setApiToken(creds.data.api_token);
    }
  }, [creds.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (apiId.trim().length < 3 || apiToken.trim().length < 3) throw new Error("أدخل API ID و API Token");
      const { error } = await supabase
        .from("yalidine_credentials")
        .upsert({ store_id: store!.id, api_id: apiId.trim(), api_token: apiToken.trim() });
      if (error) throw new Error("تعذر الحفظ");
    },
    onSuccess: () => {
      toast.success("تم حفظ مفاتيح Yalidine");
      qc.invalidateQueries({ queryKey: ["yalidine"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      await supabase.from("yalidine_credentials").delete().eq("store_id", store!.id);
    },
    onSuccess: () => {
      setApiId("");
      setApiToken("");
      toast.success("تم فصل حساب Yalidine");
      qc.invalidateQueries({ queryKey: ["yalidine"] });
    },
  });

  const test = useMutation({
    mutationFn: () => testFn({ data: { api_id: apiId.trim(), api_token: apiToken.trim() } }),
    onSuccess: (r) => (r.ok ? toast.success(r.message) : toast.error(r.message)),
    onError: () => toast.error("أدخل المفاتيح أولاً"),
  });

  return (
    <>
      <PageHeader title="ربط Yalidine Express" description="أرسل الطلبات المؤكدة مباشرة إلى Yalidine واحصل على رقم التتبع تلقائياً." />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <form
          className="space-y-5 rounded-2xl bg-card p-6 shadow-card"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">مفاتيح الربط</h2>
            {creds.data ? (
              <Badge variant="success">
                <CheckCircle2 className="size-3" /> مربوط
              </Badge>
            ) : (
              <Badge variant="neutral">غير مربوط</Badge>
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
              {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} حفظ
            </Button>
            <Button type="button" variant="outline" disabled={test.isPending} onClick={() => test.mutate()}>
              {test.isPending ? <Loader2 className="animate-spin" /> : <PlugZap />} اختبار الاتصال
            </Button>
            {creds.data && (
              <Button type="button" variant="ghost" className="text-danger" onClick={() => remove.mutate()}>
                <Trash2 /> فصل الحساب
              </Button>
            )}
          </div>
        </form>
        <div className="rounded-2xl bg-sidebar p-6 text-sidebar-foreground shadow-card">
          <h2 className="font-semibold">كيف تحصل على المفاتيح؟</h2>
          <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-sidebar-muted">
            <li>ادخل إلى حسابك في Yalidine.</li>
            <li>افتح قسم «الإعدادات» ثم «API / المطوّرين».</li>
            <li>انسخ API ID و API Token والصقهما هنا.</li>
            <li>اضغط «اختبار الاتصال» للتأكد.</li>
          </ol>
          <p className="mt-5 text-xs text-sidebar-muted">
            ولاية الإرسال تُحدَّد من «إعدادات المتجر». مفاتيحك مرئية لك فقط ولا يطّلع عليها أي تاجر آخر.
          </p>
        </div>
      </div>
    </>
  );
}
