"use client";

import { useState, useEffect } from "react";
import { Share2, Copy, Check, AlertTriangle } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

type InputMode = "manual" | "url";

interface OgData {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName: string;
}

const EMPTY_OG: OgData = {
  title: "",
  description: "",
  image: "",
  url: "",
  siteName: "",
};

export default function OgPreview() {
  const [mode, setMode] = useState<InputMode>("manual");
  const [og, setOg] = useState<OgData>({
    ...EMPTY_OG,
    title: "My Awesome Page",
    description:
      "A great description that makes people want to click through and learn more about this topic.",
    siteName: "example.com",
    url: "https://example.com/page",
  });
  const [urlInput, setUrlInput] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "og-preview" });
  }, []);

  const update = (key: keyof OgData, value: string) =>
    setOg((prev) => ({ ...prev, [key]: value }));

  const titleWarning = og.title.length > 60;
  const descWarning = og.description.length > 155;

  const handleFetchUrl = async () => {
    if (!urlInput.trim()) return;
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch(
        `/api/tools/og-fetch?url=${encodeURIComponent(urlInput)}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not fetch URL");
      }
      const data = await res.json();

      setOg({
        title: data.title || "",
        description: data.description || "",
        image: data.image || "",
        url: data.url || urlInput,
        siteName: data.siteName || "",
      });
      trackEvent("tool_used", { tool: "og-preview", mode: "url" });
    } catch (err) {
      setFetchError(
        err instanceof Error
          ? err.message
          : "Could not fetch that URL. Try entering OG tags manually instead."
      );
    } finally {
      setFetching(false);
    }
  };

  const handleCopyTags = async () => {
    const tags = [
      `<meta property="og:title" content="${og.title}" />`,
      `<meta property="og:description" content="${og.description}" />`,
      og.image && `<meta property="og:image" content="${og.image}" />`,
      og.url && `<meta property="og:url" content="${og.url}" />`,
      og.siteName &&
        `<meta property="og:site_name" content="${og.siteName}" />`,
    ]
      .filter(Boolean)
      .join("\n");
    await navigator.clipboard.writeText(tags);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const domain = og.url
    ? (() => {
        try {
          return new URL(og.url).hostname;
        } catch {
          return og.siteName || "example.com";
        }
      })()
    : og.siteName || "example.com";

  return (
    <div>
      <ToolPageHeader
        icon={Share2}
        title="OG Image Preview"
        description="Preview how your Open Graph tags look on social platforms."
      />

      {/* Mode Toggle */}
      <div className="flex gap-1 p-1 bg-bg-surface border border-border rounded-lg mb-6 max-w-xs mx-auto">
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "manual"
              ? "bg-accent text-accent-fg"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => setMode("url")}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "url"
              ? "bg-accent text-accent-fg"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Fetch URL
        </button>
      </div>

      {/* URL fetch input */}
      {mode === "url" && (
        <div className="bg-bg-surface border border-border rounded-xl p-5 mb-6">
          <div className="flex gap-3">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent placeholder:text-text-tertiary"
              onKeyDown={(e) => e.key === "Enter" && handleFetchUrl()}
            />
            <button
              onClick={handleFetchUrl}
              disabled={fetching || !urlInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-accent text-accent-fg font-medium hover:bg-accent/90 transition-colors disabled:opacity-40"
            >
              {fetching ? "Fetching..." : "Fetch"}
            </button>
          </div>
          {fetchError && (
            <p className="text-sm text-red-400 mt-2">{fetchError}</p>
          )}
        </div>
      )}

      {/* Manual inputs */}
      <div className="bg-bg-surface border border-border rounded-xl p-5 mb-6 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-text-secondary">
              og:title
            </label>
            <span
              className={`text-xs font-mono ${
                titleWarning ? "text-amber-400" : "text-text-tertiary"
              }`}
            >
              {og.title.length}/60
              {titleWarning && (
                <AlertTriangle className="w-3 h-3 inline ml-1" />
              )}
            </span>
          </div>
          <input
            type="text"
            value={og.title}
            onChange={(e) => {
              update("title", e.target.value);
              trackEvent("tool_used", { tool: "og-preview", mode: "manual" });
            }}
            className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-text-secondary">
              og:description
            </label>
            <span
              className={`text-xs font-mono ${
                descWarning ? "text-amber-400" : "text-text-tertiary"
              }`}
            >
              {og.description.length}/155
              {descWarning && (
                <AlertTriangle className="w-3 h-3 inline ml-1" />
              )}
            </span>
          </div>
          <textarea
            value={og.description}
            onChange={(e) => update("description", e.target.value)}
            rows={2}
            className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-text-secondary block mb-1">
            og:image URL
          </label>
          <input
            type="text"
            value={og.image}
            onChange={(e) => update("image", e.target.value)}
            placeholder="https://example.com/og-image.png"
            className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent placeholder:text-text-tertiary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              og:url
            </label>
            <input
              type="text"
              value={og.url}
              onChange={(e) => update("url", e.target.value)}
              className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              og:site_name
            </label>
            <input
              type="text"
              value={og.siteName}
              onChange={(e) => update("siteName", e.target.value)}
              className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleCopyTags}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-accent text-accent-fg hover:bg-accent/90 transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied" : "Copy Meta Tags"}
          </button>
        </div>
      </div>

      {/* Preview cards */}
      <h2 className="font-heading font-semibold text-lg mb-4">
        Platform Previews
      </h2>

      <div className="space-y-6">
        {/* Twitter Card */}
        <div>
          <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2 block">
            Twitter / X
          </label>
          <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden max-w-lg">
            {og.image && (
              <div className="aspect-[1.91/1] bg-bg-elevated relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={og.image}
                  alt="OG Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
            <div className="p-3">
              <p className="text-xs text-text-tertiary">{domain}</p>
              <p className="text-sm font-medium text-text-primary truncate">
                {og.title || "Page Title"}
              </p>
              <p className="text-xs text-text-secondary line-clamp-2">
                {og.description || "Page description"}
              </p>
            </div>
          </div>
        </div>

        {/* Facebook Share */}
        <div>
          <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2 block">
            Facebook
          </label>
          <div className="bg-bg-surface border border-border rounded-lg overflow-hidden max-w-lg">
            {og.image && (
              <div className="aspect-[1.91/1] bg-bg-elevated relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={og.image}
                  alt="OG Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
            <div className="px-3 py-2.5 bg-bg-elevated border-t border-border">
              <p className="text-xs text-text-tertiary uppercase">{domain}</p>
              <p className="text-sm font-semibold text-text-primary mt-0.5 truncate">
                {og.title || "Page Title"}
              </p>
              <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                {og.description || "Page description"}
              </p>
            </div>
          </div>
        </div>

        {/* LinkedIn Post */}
        <div>
          <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2 block">
            LinkedIn
          </label>
          <div className="bg-bg-surface border border-border rounded-lg overflow-hidden max-w-lg">
            {og.image && (
              <div className="aspect-[1.91/1] bg-bg-elevated relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={og.image}
                  alt="OG Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold text-text-primary truncate">
                {og.title || "Page Title"}
              </p>
              <p className="text-xs text-text-tertiary mt-0.5">{domain}</p>
            </div>
          </div>
        </div>

        {/* Slack Unfurl */}
        <div>
          <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2 block">
            Slack
          </label>
          <div className="flex max-w-lg">
            <div className="w-1 bg-accent rounded-l-lg shrink-0" />
            <div className="flex-1 bg-bg-surface border border-l-0 border-border rounded-r-lg p-3">
              <p className="text-xs font-medium text-text-secondary">
                {og.siteName || domain}
              </p>
              <p className="text-sm font-bold text-accent mt-0.5">
                {og.title || "Page Title"}
              </p>
              <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                {og.description || "Page description"}
              </p>
              {og.image && (
                <div className="mt-2 max-w-[200px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={og.image}
                    alt="Slack preview"
                    className="rounded-md w-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
