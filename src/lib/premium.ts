import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const FREE_RECIPE_LIMIT = 20;

export function usePlan() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["plan-tier", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("plan_tier").eq("id", user!.id).maybeSingle();
      return (data?.plan_tier ?? "free") as "free" | "pro";
    },
    enabled: !!user,
  });
  const tier = data ?? "free";
  return { tier, isPro: tier === "pro", isFree: tier !== "pro" };
}
