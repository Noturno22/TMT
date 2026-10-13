import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import type { CapitalContract, CapitalPlanId } from "@/lib/types";

interface CapitalContractRow {
  id: string;
  user_id: string;
  plan_id: CapitalPlanId;
  currency: "usd" | "aoa";
  capital_inicial: number | string;
  start_date: string;
  end_date: string;
  months: number;
  status: "active" | "completed" | "cancelled";
  penalty_pct: number | string;
  terms_version: string;
  created_at: string;
  updated_at: string;
}

function toContract(row: CapitalContractRow): CapitalContract {
  return {
    id: row.id,
    user_id: row.user_id,
    plan_id: row.plan_id,
    currency: row.currency,
    capital_inicial: Number(row.capital_inicial) || 0,
    start_date: row.start_date,
    end_date: row.end_date,
    months: row.months,
    status: row.status,
    penalty_pct: Number(row.penalty_pct) || 0,
    terms_version: row.terms_version,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function fetchContract(userId: string): Promise<CapitalContract | null> {
  const { data, error } = await supabase
    .from("capital_contracts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toContract(data as CapitalContractRow) : null;
}

export function useCapitalContract() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = !!user?.id;

  const contractQuery = useQuery<CapitalContract | null, Error>({
    queryKey: ["capital-contract", user?.id],
    queryFn: () => (user ? fetchContract(user.id) : Promise.resolve(null)),
    enabled,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`capital-contract-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "capital_contracts", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["capital-contract", user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const activate = async (
    planId: CapitalPlanId,
    currency: "usd" | "aoa" = "usd",
  ): Promise<CapitalContract | null> => {
    const { data, error } = await supabase.rpc("activate_capital_contract", {
      p_plan_id: planId,
      p_currency: currency,
    });
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ["capital-contract", user?.id] });
    return (data as CapitalContract | null) ?? null;
  };

  return {
    contract: contractQuery.data ?? null,
    loading: contractQuery.isLoading,
    activate,
  };
}
