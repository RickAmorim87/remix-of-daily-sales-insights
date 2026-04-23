import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Fechamento } from "@/lib/fechamentos";

export function useFechamentos() {
  const [data, setData] = useState<Fechamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("fechamentos_diarios")
      .select("*")
      .order("data", { ascending: false })
      .limit(365);
    if (error) setError(error.message);
    else setData((rows ?? []) as unknown as Fechamento[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("fechamentos_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fechamentos_diarios" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error, reload: load };
}
