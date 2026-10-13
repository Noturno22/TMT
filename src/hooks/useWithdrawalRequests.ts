import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import type { WithdrawalRequest } from "@/lib/adminApi";

interface WithdrawalRequestRow {
  id: string;
  user_id: string;
  method: string;
  amount: number | string;
  currency: string;
  details: string | null;
  status: "pending" | "approved" | "rejected" | "paid";
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
}

function toWithdrawalRequest(row: WithdrawalRequestRow): WithdrawalRequest {
  return {
    id: row.id,
    user_id: row.user_id,
    method: row.method,
    amount: Number(row.amount) || 0,
    currency: row.currency,
    details: row.details,
    status: row.status,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    notes: row.notes,
    created_at: row.created_at,
  };
}

async function fetchRequests(userId: string): Promise<WithdrawalRequest[]> {
  const { data, error } = await supabase
    .from("withdrawal_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return ((data ?? []) as WithdrawalRequestRow[]).map(toWithdrawalRequest);
}

export function useWithdrawalRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = !!user?.id;

  const requestsQuery = useQuery<WithdrawalRequest[], Error>({
    queryKey: ["withdrawal-requests", user?.id],
    queryFn: () => (user ? fetchRequests(user.id) : Promise.resolve([])),
    enabled,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`withdrawal-requests-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawal_requests", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["withdrawal-requests", user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    requests: requestsQuery.data ?? [],
    loading: requestsQuery.isLoading,
  };
}
