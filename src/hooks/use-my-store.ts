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
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  queryFn: async (): Promise<StoreContext | null> => {
    // getSession reads the cached session straight from local storage, so the
    // dashboard does not wait on an auth network request just to render.
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return null;
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
  // Platform admin: no limits, no trial banners, every Pro feature open.
  const { data: isAdmin = false } = useQuery(isAdminQuery);
  const rawSub = store ? subscriptionState(store) : null;
  const sub = rawSub && isAdmin
    ? { ...rawSub, isActive: true, isTrial: false, showWarning: false, isGracePeriod: false, graceEndsAt: null }
    : rawSub;
  const tier = isAdmin ? "pro" : store ? effectiveTier(store) : "start";
  return {
    ...q,
    store,
    sub,
    isAdmin,
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
