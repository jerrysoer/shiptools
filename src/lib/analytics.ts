"use client";

import type { AnalyticsEvent, AnalyticsEventName } from "./types";
import { hasOptedOut } from "./consent";

function getSessionId(): string {
  if (typeof sessionStorage === "undefined") return "unknown";
  let id = sessionStorage.getItem("st_session_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("st_session_id", id);
  }
  return id;
}

/**
 * Fire-and-forget event tracking.
 * Sends to /api/analytics/event — never blocks UI.
 */
export function trackEvent(
  event: AnalyticsEventName,
  properties?: Record<string, string | number | boolean>
) {
  if (hasOptedOut()) return;

  const payload: AnalyticsEvent = {
    event,
    properties,
    timestamp: new Date().toISOString(),
    session_id: getSessionId(),
  };

  // navigator.sendBeacon is fire-and-forget, survives page unloads
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/analytics/event",
      new Blob([JSON.stringify(payload)], { type: "application/json" })
    );
  } else {
    fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Swallow — analytics should never break the app
    });
  }
}
