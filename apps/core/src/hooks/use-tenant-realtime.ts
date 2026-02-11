"use client";

import { useEffect, useRef } from "react";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { useOrg } from "@/components/org-provider";

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE";

interface PostgresChange {
  eventType: RealtimeEvent;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

/**
 * Subscribe to Supabase Realtime postgres_changes on a tenant table.
 * Creates a lightweight client using the org's public anon key.
 */
export function useTenantRealtime(
  table: string,
  callback: (payload: PostgresChange) => void,
) {
  const { supabaseUrl, supabaseAnonKey } = useOrg();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return;

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    });

    const channel: RealtimeChannel = client
      .channel(`tenant-${table}`)
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table },
        (payload: PostgresChange) => {
          callbackRef.current(payload);
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      client.removeChannel(channel);
    };
  }, [supabaseUrl, supabaseAnonKey, table]);
}
