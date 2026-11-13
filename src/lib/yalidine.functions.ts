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
    if (error) {
      console.error("Could not load order for Yalidine", error);
      throw error;
    }
    if (!order) return { ok: false as const, message: "الطلب غير موجود." };
    if (order.tracking_number) return { ok: true as const, tracking: order.tracking_number, message: "الطلب مرسل مسبقاً." };

    const { data: store, error: storeError } = await sb
      .from("stores")
      .select("id,origin_wilaya_code,name")
      .eq("id", order.store_id)
      .maybeSingle();
    if (storeError) {
      console.error("Could not load store for Yalidine", storeError);
      throw storeError;
    }
    const { data: creds, error: credsError } = await sb
      .from("yalidine_credentials")
      .select("api_id,api_token")
      .eq("store_id", order.store_id)
      .maybeSingle();
    if (credsError) {
      console.error("Could not load Yalidine credentials", credsError);
      throw credsError;
    }
    if (!store || !creds) return { ok: false as const, message: "اربط حساب Yalidine أولاً من صفحة الربط." };

    const { data: storeIsActive, error: activeError } = await sb.rpc("store_is_active", {
      _store_id: order.store_id,
    });
    if (activeError) {
      console.error("Could not check store status before Yalidine dispatch", activeError);
      throw activeError;
    }
    if (!storeIsActive) {
      return { ok: false as const, message: "المتجر في وضع القراءة فقط. جدّد الاشتراك قبل إرسال الطلب." };
    }

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
      if (upErr) {
        console.error("tracking update failed after Yalidine accepted parcel", upErr);
        return {
          ok: false as const,
          tracking: result.tracking,
          message: `أنشأت Yalidine الطرد برقم التتبع ${result.tracking}، لكن تعذر حفظه في الطلب. لا تعِد الإرسال.`,
        };
      }
      return { ok: true as const, tracking: result.tracking, message: "تم إنشاء الطرد بنجاح." };
    } catch (e) {
      console.error("yalidine send failed", e);
      return { ok: false as const, message: "تعذر الوصول إلى خادم Yalidine حالياً." };
    }
  });

type YalidineSyncStatus = "new" | "confirmed" | "shipping" | "delivered" | "cancelled" | "returned";

/** Yalidine reports parcel states in French; only known states are mapped. */
const STATUS_BY_PARCEL_STATE: Record<string, YalidineSyncStatus> = {
  "en preparation": "confirmed",
  prepare: "confirmed",
  ramasse: "shipping",
  "en cours de livraison": "shipping",
  "sorti en livraison": "shipping",
  "vers wilaya": "shipping",
  "recu a wilaya": "shipping",
  "en cours d expedition": "shipping",
  "en cours de traitement": "shipping",
  livre: "delivered",
  retourne: "returned",
  "en retour": "returned",
  "retour en cours": "returned",
  "en cours de retour": "returned",
  annule: "cancelled",
  supprime: "cancelled",
  suspendu: "cancelled",
};

function normalizeParcelState(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function findParcel(body: unknown, tracking: string): Record<string, unknown> | null {
  let list: unknown[] = [];
  if (Array.isArray(body)) list = body;
  else if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (Array.isArray(record["data"])) list = record["data"];
    else if (record[tracking] && typeof record[tracking] === "object") list = [record[tracking]];
  }
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const parcel = item as Record<string, unknown>;
    const parcelTracking = typeof parcel["tracking"] === "string" ? parcel["tracking"] : null;
    if (!parcelTracking || parcelTracking === tracking) return parcel;
  }
  return null;
}

/**
 * Pulls the latest parcel state from Yalidine for every unfinished order that
 * already has a tracking number. Unknown or unreadable states are left as-is.
 */
export const syncYalidineStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const { data: orders, error } = await sb
      .from("orders")
      .select("id,store_id,tracking_number,status")
      .not("tracking_number", "is", null)
      .in("status", ["new", "confirmed", "shipping"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("Could not load orders for Yalidine sync", error);
      throw error;
    }
    if (!orders || orders.length === 0) {
      return { ok: true as const, checked: 0, updated: 0, skipped: 0 };
    }

    const storeIds = [...new Set(orders.map((order) => order.store_id))];
    const { data: credentials, error: credsError } = await sb
      .from("yalidine_credentials")
      .select("store_id,api_id,api_token")
      .in("store_id", storeIds);
    if (credsError) {
      console.error("Could not load Yalidine credentials for sync", credsError);
      throw credsError;
    }
    const credsByStore = new Map(
      (credentials ?? []).map((creds) => [creds.store_id, { api_id: creds.api_id, api_token: creds.api_token }]),
    );
    if (credsByStore.size === 0) {
      return { ok: false as const, message: "اربط حساب Yalidine أولاً من صفحة الربط." };
    }

    let updated = 0;
    let skipped = 0;
    let checked = 0;

    const batchSize = 5;
    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (order) => {
          const tracking = order.tracking_number;
          const creds = credsByStore.get(order.store_id);
          if (!tracking || !creds) {
            skipped += 1;
            return;
          }
          checked += 1;
          try {
            const response = await yalidineFetch(
              `/parcels/?tracking=${encodeURIComponent(tracking)}&page_size=1`,
              creds,
            );
            if (!response.ok) {
              skipped += 1;
              return;
            }
            const parcel = findParcel(response.body, tracking);
            const rawState = parcel?.["status"] ?? parcel?.["state"] ?? parcel?.["etat"];
            if (typeof rawState !== "string" || !rawState.trim()) {
              skipped += 1;
              return;
            }
            const nextStatus = STATUS_BY_PARCEL_STATE[normalizeParcelState(rawState)];
            if (!nextStatus || nextStatus === order.status) {
              skipped += 1;
              return;
            }
            const { error: updateError } = await sb
              .from("orders")
              .update({ status: nextStatus })
              .eq("id", order.id);
            if (updateError) {
              console.error("Could not apply Yalidine status to order", order.id, updateError);
              skipped += 1;
              return;
            }
            updated += 1;
          } catch (e) {
            console.error("Yalidine status sync failed for order", order.id, e);
            skipped += 1;
          }
        }),
      );
    }

    return { ok: true as const, checked, updated, skipped };
  });
