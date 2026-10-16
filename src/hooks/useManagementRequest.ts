import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { submitManagementRequest } from "@/lib/adminApi";
import type { CapitalPlanId } from "@/lib/types";

export interface ManagementRequest {
  id: string;
  user_id: string;
  plan_id: CapitalPlanId;
  currency: "usd" | "aoa";
  note: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

async function fetchLatest(userId: string): Promise<ManagementRequest | null> {
  const { data, error } = await supabase
    .from("capital_management_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ManagementRequest | null) ?? null;
}

export function useManagementRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = !!user?.id;

  const query = useQuery<ManagementRequest | null, Error>({
    queryKey: ["capital-management-request", user?.id],
    queryFn: () => (user ? fetchLatest(user.id) : Promise.resolve(null)),
    enabled,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`capital-management-request-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "capital_management_requests", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["capital-management-request", user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const submit = async (planId: CapitalPlanId, currency: "usd" | "aoa", note?: string) => {
    await submitManagementRequest({ plan_id: planId, currency, note });
    await queryClient.invalidateQueries({ queryKey: ["capital-management-request", user?.id] });
  };

  return {
    request: query.data ?? null,
    loading: query.isLoading,
    submit,
  };
}
