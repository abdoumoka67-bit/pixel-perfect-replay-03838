import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { effectiveTier, subscriptionState, type StoreAccess } from "@/lib/commerce";
import type { Tables } from "@/integrations/supabase/types";

export type Store = Tables<"stores">;

export type StoreContext = {
  store: Store;
  access: StoreAccess;
  memberId: string | null;
};

/** The store the signed-in person works on: their own, or one they joined as a team member. */
export const myStoreQuery = queryOptions({
  queryKey: ["my-store"],
  queryFn: async (): Promise<StoreContext | null> => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data: access, error: accessError } = await supabase.rpc("my_store_access");
    if (accessError) throw accessError;
    const row = access?.[0];
    if (!row) return null;
    const { data, error } = await supabase.from("stores").select("*").eq("id", row.store_id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const role: StoreAccess = row.access === "manager" || row.access === "agent" ? row.access : "owner";
    return { store: data, access: role, memberId: row.member_id ?? null };
  },
});

export function useMyStore() {
  const q = useQuery(myStoreQuery);
  const store = q.data?.store ?? null;
  const access: StoreAccess = q.data?.access ?? "owner";
  const sub = store ? subscriptionState(store) : null;
  const tier = store ? effectiveTier(store) : "start";
  return {
    ...q,
    store,
    sub,
    readOnly: sub ? !sub.isActive : false,
    tier,
    isPro: tier === "pro",
    access,
    memberId: q.data?.memberId ?? null,
    isOwner: access === "owner",
    canManage: access !== "agent",
  };
}

export const isAdminQuery = queryOptions({
  queryKey: ["is-admin"],
  queryFn: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return false;
    const { data } = await supabase.rpc("has_role", { _user_id: auth.user.id, _role: "admin" });
    return Boolean(data);
  },
});
