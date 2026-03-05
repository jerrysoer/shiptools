"use client";

import { useState, useEffect } from "react";
import { getConsentStatus, setConsentStatus } from "@/lib/consent";
import { trackEvent } from "@/lib/analytics";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsentStatus() === "unknown") {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function accept() {
    setConsentStatus("accepted");
    setVisible(false);
  }

  function decline() {
    // Fire opt-out event before the guard kicks in
    trackEvent("telemetry_opted_out");
    setConsentStatus("declined");
    setVisible(false);
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="max-w-xl mx-auto bg-bg-elevated border border-border rounded-xl px-5 py-4 shadow-lg">
        <p className="text-text-secondary text-sm mb-3">
          ShipTools uses privacy-respecting analytics to improve the product. No
          personal data is collected.
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={accept}
            className="px-4 py-1.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
          >
            Got it
          </button>
          <button
            onClick={decline}
            className="text-text-tertiary text-sm hover:text-text-secondary transition-colors"
          >
            Opt out
          </button>
        </div>
      </div>
    </div>
  );
}
