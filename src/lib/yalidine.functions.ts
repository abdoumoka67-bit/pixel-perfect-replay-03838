import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { wilayaByCode } from "@/data/wilayas";

const API = "https://api.yalidine.app/v1";

async function yalidineFetch(path: string, creds: { api_id: string; api_token: string }, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "X-API-ID": creds.api_id,
      "X-API-TOKEN": creds.api_token,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

export const testYalidineConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ api_id: z.string().min(3).max(200), api_token: z.string().min(3).max(500) }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const r = await yalidineFetch("/wilayas/?page_size=1", data);
      if (r.ok) return { ok: true as const, message: "تم الاتصال بنجاح بحساب Yalidine." };
      if (r.status === 401 || r.status === 403)
        return { ok: false as const, message: "المفاتيح غير صحيحة. تحقق من API ID و API Token." };
      return { ok: false as const, message: `تعذر الاتصال (رمز ${r.status}).` };
    } catch (e) {
      console.error("yalidine test failed", e);
      return { ok: false as const, message: "تعذر الوصول إلى خادم Yalidine حالياً." };
    }
  });

export const sendOrderToYalidine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: order, error } = await sb.from("orders").select("*").eq("id", data.orderId).maybeSingle();
    if (error || !order) return { ok: false as const, message: "الطلب غير موجود." };
    if (order.tracking_number) return { ok: true as const, tracking: order.tracking_number, message: "الطلب مرسل مسبقاً." };

    const { data: store } = await sb
      .from("stores")
      .select("id,origin_wilaya_code,name")
      .eq("id", order.store_id)
      .maybeSingle();
    const { data: creds } = await sb
      .from("yalidine_credentials")
      .select("api_id,api_token")
      .eq("store_id", order.store_id)
      .maybeSingle();
    if (!store || !creds) return { ok: false as const, message: "اربط حساب Yalidine أولاً من صفحة الربط." };

    const toWilaya = wilayaByCode(order.wilaya_code);
    const fromWilaya = wilayaByCode(store.origin_wilaya_code);
    if (!toWilaya || !fromWilaya) return { ok: false as const, message: "الولاية غير معروفة." };

    const [firstname, ...rest] = order.customer_name.trim().split(/\s+/);
    let stopdeskId: number | undefined;
    try {
      if (order.delivery_type === "desk") {
        const centers = await yalidineFetch(`/centers/?wilaya_id=${order.wilaya_code}`, creds);
        const list = ((centers.body as { data?: Array<{ center_id: number; commune_name: string }> })?.data ?? []);
        const match = list.find((c) => c.commune_name?.toLowerCase() === order.commune.toLowerCase()) ?? list[0];
        if (!match) return { ok: false as const, message: "لا يوجد مكتب Yalidine في هذه الولاية." };
        stopdeskId = match.center_id;
      }

      const parcel = {
        order_id: `ORX-${order.order_number}`,
        from_wilaya_name: fromWilaya.fr,
        firstname: firstname || order.customer_name,
        familyname: rest.join(" ") || firstname || order.customer_name,
        contact_phone: order.phone,
        address: order.address || order.commune,
        to_commune_name: order.commune,
        to_wilaya_name: toWilaya.fr,
        product_list: `${order.product_name} x${order.quantity}`,
        price: order.total,
        do_insurance: false,
        declared_value: order.subtotal,
        length: 30,
        width: 20,
        height: 10,
        weight: 1,
        freeshipping: true,
        is_stopdesk: order.delivery_type === "desk",
        stopdesk_id: stopdeskId,
        has_exchange: false,
      };

      const r = await yalidineFetch("/parcels/", creds, { method: "POST", body: JSON.stringify([parcel]) });
      const result = (r.body as Record<string, { success?: boolean; tracking?: string; message?: string }>)?.[
        parcel.order_id
      ];
      if (!r.ok || !result?.success || !result.tracking) {
        console.error("yalidine create parcel failed", r.status, r.body);
        return { ok: false as const, message: result?.message || "رفضت Yalidine إنشاء الطرد. تحقق من بيانات الطلب." };
      }

      const { error: upErr } = await sb
        .from("orders")
        .update({ tracking_number: result.tracking, status: "shipping" })
        .eq("id", order.id);
      if (upErr) console.error("tracking update failed", upErr);
      return { ok: true as const, tracking: result.tracking, message: "تم إنشاء الطرد بنجاح." };
    } catch (e) {
      console.error("yalidine send failed", e);
      return { ok: false as const, message: "تعذر الوصول إلى خادم Yalidine حالياً." };
    }
  });
