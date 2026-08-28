"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Automatically refreshes the current route when server-sent events are received.
 */
export function useAutoRefresh(intervalMs?: number) {
  const router = useRouter();

  useEffect(() => {
    // We use SSE for push updates instead of polling
    const eventSource = new EventSource("/api/events");
    
    eventSource.onopen = () => console.log("[Realtime] Connected to SSE");
    eventSource.onerror = (err) => console.error("[Realtime] SSE Error", err);

    eventSource.onmessage = (event) => {
      console.log("[Realtime] Received event:", event.data);
      if (event.data === "update") {
        console.log("[Realtime] Triggering router.refresh()");
        router.refresh();
      }
    };

    return () => {
      console.log("[Realtime] Disconnecting SSE");
      eventSource.close();
    };
  }, [router]);
}
