import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CUSTOM_DOMAIN_CNAME_TARGET } from "@/lib/commerce";

export function cnamePointsToTarget(answers: Array<{ data?: string }> | undefined, target: string): boolean {
  const t = target.toLowerCase().replace(/\.$/, "");
  return (answers ?? []).some((a) => (a.data ?? "").toLowerCase().replace(/\.$/, "") === t);
}

export const verifyCustomDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { storeId: string }) => {
    if (!input || typeof input.storeId !== "string") throw new Error("INVALID_INPUT");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: store, error } = await supabase
      .from("stores")
      .select("id, owner_id, storefront_config")
      .eq("id", data.storeId)
      .maybeSingle();
    if (error || !store || store.owner_id !== userId) return { ok: false, status: "pending" as const, message: "غير مسموح" };
    const { data: tier } = await supabase.rpc("store_tier", { _store_id: store.id });
    if (tier !== "pro") return { ok: false, status: "pending" as const, message: "الدومين المخصص حصري لباقة Pro" };

    const config = (store.storefront_config && typeof store.storefront_config === "object" ? store.storefront_config : {}) as Record<string, unknown>;
    const cd = (config["custom_domain"] ?? {}) as { domain?: string; status?: string };
    const domain = (cd.domain ?? "").trim().toLowerCase();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return { ok: false, status: "pending" as const, message: "سجّل الدومين أولاً" };

    let answers: Array<{ data?: string }> = [];
    try {
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=CNAME`);
      const json = (await res.json()) as { Answer?: Array<{ data?: string }> };
      answers = json.Answer ?? [];
    } catch (e) {
      console.error("DNS lookup failed", e);
      return { ok: false, status: "pending" as const, message: "تعذر فحص DNS حالياً، حاول لاحقاً" };
    }
    if (!cnamePointsToTarget(answers, CUSTOM_DOMAIN_CNAME_TARGET)) {
      return { ok: false, status: "pending" as const, message: `سجل CNAME لا يشير بعد إلى ${CUSTOM_DOMAIN_CNAME_TARGET}` };
    }
    const { error: upErr } = await supabase
      .from("stores")
      .update({ storefront_config: { ...config, custom_domain: { domain, status: "active" } } as never })
      .eq("id", store.id);
    if (upErr) return { ok: false, status: "pending" as const, message: "تعذر تحديث الحالة" };
    return { ok: true, status: "active" as const, message: "تم التحقق — الدومين نشط" };
  });
