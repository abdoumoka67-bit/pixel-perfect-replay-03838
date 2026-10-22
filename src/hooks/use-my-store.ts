import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionState } from "@/lib/commerce";
import type { Tables } from "@/integrations/supabase/types";

export type Store = Tables<"stores">;

export const myStoreQuery = queryOptions({
  queryKey: ["my-store"],
  queryFn: async (): Promise<Store | null> => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("owner_id", auth.user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

export function useMyStore() {
  const q = useQuery(myStoreQuery);
  const sub = q.data ? subscriptionState(q.data) : null;
  return { ...q, store: q.data ?? null, sub, readOnly: sub ? !sub.isActive : false };
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
