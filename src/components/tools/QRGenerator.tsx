"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { QrCode, Download, Palette, Wifi, User, Link, Type } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

type Preset = "text" | "url" | "wifi" | "vcard";
type WifiEncryption = "WPA" | "WEP" | "nopass";

interface WifiData {
  ssid: string;
  password: string;
  encryption: WifiEncryption;
  hidden: boolean;
}

interface VCardData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  org: string;
}

const PRESET_TABS: { key: Preset; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "text", label: "Text", icon: Type },
  { key: "url", label: "URL", icon: Link },
  { key: "wifi", label: "WiFi", icon: Wifi },
  { key: "vcard", label: "vCard", icon: User },
];

function buildWifiString(data: WifiData): string {
  const escape = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
  return `WIFI:T:${data.encryption};S:${escape(data.ssid)};P:${escape(data.password)};H:${data.hidden ? "true" : "false"};;`;
}

function buildVCardString(data: VCardData): string {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${data.lastName};${data.firstName};;;`,
    `FN:${data.firstName} ${data.lastName}`,
    data.org ? `ORG:${data.org}` : "",
    data.phone ? `TEL:${data.phone}` : "",
    data.email ? `EMAIL:${data.email}` : "",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function QRGenerator() {
  const [preset, setPreset] = useState<Preset>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("https://");
  const [wifi, setWifi] = useState<WifiData>({ ssid: "", password: "", encryption: "WPA", hidden: false });
  const [vcard, setVcard] = useState<VCardData>({ firstName: "", lastName: "", phone: "", email: "", org: "" });
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [svgPreview, setSvgPreview] = useState<string>("");
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "qr" });
  }, []);

  const getPayload = useCallback((): string => {
    switch (preset) {
      case "text":
        return text;
      case "url":
        return url;
      case "wifi":
        return wifi.ssid ? buildWifiString(wifi) : "";
      case "vcard":
        return vcard.firstName || vcard.lastName ? buildVCardString(vcard) : "";
    }
  }, [preset, text, url, wifi, vcard]);

  // Live SVG preview
  useEffect(() => {
    const payload = getPayload();
    if (!payload) {
      setSvgPreview("");
      setError("");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const svg = await QRCode.toString(payload, {
          type: "svg",
          color: { dark: fgColor, light: bgColor },
          width: 256,
          margin: 2,
        });
        if (!cancelled) {
          setSvgPreview(svg);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setSvgPreview("");
          setError(err instanceof Error ? err.message : "Failed to generate QR code");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getPayload, fgColor, bgColor]);

  const downloadPNG = async () => {
    const payload = getPayload();
    if (!payload || !canvasRef.current) return;
    try {
      const QRCode = (await import("qrcode")).default;
      await QRCode.toCanvas(canvasRef.current, payload, {
        color: { dark: fgColor, light: bgColor },
        width: 1024,
        margin: 2,
      });
      const link = document.createElement("a");
      link.download = "qrcode.png";
      link.href = canvasRef.current.toDataURL("image/png");
      link.click();
      trackEvent("tool_used", { tool: "qr", format: "png" });
    } catch {
      setError("Failed to generate PNG");
    }
  };

  const downloadSVG = () => {
    if (!svgPreview) return;
    const blob = new Blob([svgPreview], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.download = "qrcode.svg";
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    trackEvent("tool_used", { tool: "qr", format: "svg" });
  };

  const payload = getPayload();

  return (
    <div>
      <ToolPageHeader
        icon={QrCode}
        title="QR Code Generator"
        description="Generate QR codes for text, URLs, WiFi, and contacts."
      />

      {/* Preset tabs */}
      <div className="flex gap-1 p-1 bg-bg-surface border border-border rounded-xl mb-6">
        {PRESET_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setPreset(key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              preset === key
                ? "bg-accent text-accent-fg"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="space-y-4">
          <div className="bg-bg-surface border border-border rounded-xl p-5">
            <h2 className="font-heading font-semibold mb-4">Content</h2>

            {preset === "text" && (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to encode..."
                rows={4}
                className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-3 text-sm font-mono resize-none focus:outline-none focus:border-accent placeholder:text-text-tertiary"
              />
            )}

            {preset === "url" && (
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent placeholder:text-text-tertiary"
              />
            )}

            {preset === "wifi" && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={wifi.ssid}
                  onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })}
                  placeholder="Network name (SSID)"
                  className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent placeholder:text-text-tertiary"
                />
                {wifi.encryption !== "nopass" && (
                  <input
                    type="text"
                    value={wifi.password}
                    onChange={(e) => setWifi({ ...wifi, password: e.target.value })}
                    placeholder="Password"
                    className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent placeholder:text-text-tertiary"
                  />
                )}
                <div className="flex gap-3 items-center">
                  <select
                    value={wifi.encryption}
                    onChange={(e) => setWifi({ ...wifi, encryption: e.target.value as WifiEncryption })}
                    className="bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="WPA">WPA/WPA2</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">None</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={wifi.hidden}
                      onChange={(e) => setWifi({ ...wifi, hidden: e.target.checked })}
                      className="accent-accent"
                    />
                    Hidden network
                  </label>
                </div>
              </div>
            )}

            {preset === "vcard" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={vcard.firstName}
                    onChange={(e) => setVcard({ ...vcard, firstName: e.target.value })}
                    placeholder="First name"
                    className="bg-bg-elevated border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent placeholder:text-text-tertiary"
                  />
                  <input
                    type="text"
                    value={vcard.lastName}
                    onChange={(e) => setVcard({ ...vcard, lastName: e.target.value })}
                    placeholder="Last name"
                    className="bg-bg-elevated border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent placeholder:text-text-tertiary"
                  />
                </div>
                <input
                  type="tel"
                  value={vcard.phone}
                  onChange={(e) => setVcard({ ...vcard, phone: e.target.value })}
                  placeholder="Phone number"
                  className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent placeholder:text-text-tertiary"
                />
                <input
                  type="email"
                  value={vcard.email}
                  onChange={(e) => setVcard({ ...vcard, email: e.target.value })}
                  placeholder="Email address"
                  className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent placeholder:text-text-tertiary"
                />
                <input
                  type="text"
                  value={vcard.org}
                  onChange={(e) => setVcard({ ...vcard, org: e.target.value })}
                  placeholder="Organization (optional)"
                  className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent placeholder:text-text-tertiary"
                />
              </div>
            )}
          </div>

          {/* Color pickers */}
          <div className="bg-bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-text-tertiary" />
              <h2 className="font-heading font-semibold">Colors</h2>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-3">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-8 h-8 rounded border border-border cursor-pointer"
                />
                <span className="text-sm text-text-secondary">Foreground</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-8 h-8 rounded border border-border cursor-pointer"
                />
                <span className="text-sm text-text-secondary">Background</span>
              </label>
            </div>
          </div>
        </div>

        {/* Preview panel */}
        <div className="bg-bg-surface border border-border rounded-xl p-5 flex flex-col items-center">
          <h2 className="font-heading font-semibold mb-4 self-start">Preview</h2>

          <div className="w-64 h-64 rounded-xl border border-border flex items-center justify-center overflow-hidden mb-4"
            style={{ backgroundColor: bgColor }}
          >
            {svgPreview ? (
              <iframe
                sandbox=""
                srcDoc={`<!DOCTYPE html><html><head><style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100%;background:${bgColor}}svg{width:100%;height:100%}</style></head><body>${svgPreview}</body></html>`}
                className="w-full h-full"
                title="QR Code Preview"
              />
            ) : (
              <span className={`text-sm ${error ? "text-grade-f" : "text-text-tertiary"}`}>
                {error || "Enter content to generate a QR code"}
              </span>
            )}
          </div>

          {/* Error shown only below preview, not inside */}

          <div className="flex gap-3 w-full">
            <button
              onClick={downloadPNG}
              disabled={!payload}
              className="flex-1 flex items-center justify-center gap-2 bg-accent text-accent-fg px-4 py-2 rounded-lg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Download PNG
            </button>
            <button
              onClick={downloadSVG}
              disabled={!svgPreview}
              className="flex-1 flex items-center justify-center gap-2 bg-bg-elevated border border-border px-4 py-2 rounded-lg hover:border-border-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Download SVG
            </button>
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  );
}
