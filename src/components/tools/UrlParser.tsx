"use client";

import { useState, useEffect, useCallback } from "react";
import { Link, Copy, Check } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

/* ── Types ───────────────────────────────────── */

interface ParsedUrl {
  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
  params: [string, string][];
}

/* ── Component ───────────────────────────────── */

export default function UrlParser() {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParsedUrl | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [encoded, setEncoded] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "url" });
  }, []);

  const parseUrl = useCallback((raw: string) => {
    setInput(raw);
    if (!raw.trim()) {
      setParsed(null);
      setError(null);
      return;
    }

    try {
      const url = new URL(raw);
      const params: [string, string][] = [];
      url.searchParams.forEach((value, key) => {
        params.push([key, value]);
      });
      setParsed({
        protocol: url.protocol,
        host: url.host,
        hostname: url.hostname,
        port: url.port,
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
        origin: url.origin,
        params,
      });
      setError(null);
      trackEvent("tool_used", { tool: "url" });
    } catch {
      setParsed(null);
      setError("Invalid URL. Make sure it includes the protocol (e.g. https://)");
    }
  }, []);

  const copyValue = useCallback(async (value: string, field: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const CopyBtn = ({ value, field }: { value: string; field: string }) => (
    <button
      onClick={() => copyValue(value, field)}
      className="p-1.5 rounded-md hover:bg-bg-elevated transition-colors shrink-0"
      title={`Copy ${field}`}
    >
      {copiedField === field ? (
        <Check className="w-3.5 h-3.5 text-grade-a" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-text-tertiary" />
      )}
    </button>
  );

  const displayUrl = encoded ? encodeURI(input) : input;

  const fields: { label: string; value: string; key: string }[] = parsed
    ? [
        { label: "Protocol", value: parsed.protocol, key: "protocol" },
        { label: "Host", value: parsed.host, key: "host" },
        { label: "Hostname", value: parsed.hostname, key: "hostname" },
        { label: "Port", value: parsed.port || "(default)", key: "port" },
        { label: "Origin", value: parsed.origin, key: "origin" },
        { label: "Path", value: parsed.pathname, key: "path" },
        { label: "Query String", value: parsed.search, key: "search" },
        { label: "Hash", value: parsed.hash, key: "hash" },
      ]
    : [];

  return (
    <div>
      <ToolPageHeader
        icon={Link}
        title="URL Parser"
        description="Parse URLs into their component parts. Extract protocol, host, port, path, query parameters, and hash."
      />

      {/* Input */}
      <div className="mb-6">
        <label htmlFor="url-input" className="block text-sm font-medium mb-1.5">
          URL
        </label>
        <input
          id="url-input"
          type="text"
          value={input}
          onChange={(e) => parseUrl(e.target.value)}
          placeholder="https://example.com:8080/path?key=value&foo=bar#section"
          className="w-full bg-bg-surface border border-border px-4 py-3 text-sm font-mono placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Encode/Decode toggle */}
      {parsed && (
        <div className="flex items-center gap-3 mb-6">
          <div className="flex gap-1 p-1 bg-bg-surface border border-border">
            <button
              onClick={() => setEncoded(false)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                !encoded
                  ? "bg-accent text-accent-fg"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Raw
            </button>
            <button
              onClick={() => setEncoded(true)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                encoded
                  ? "bg-accent text-accent-fg"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Encoded
            </button>
          </div>
          {encoded && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-text-secondary truncate">
                  {displayUrl}
                </code>
                <CopyBtn value={displayUrl} field="encoded-url" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 text-sm text-grade-f bg-grade-f/10 border border-grade-f/20 px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Parsed fields */}
      {parsed && (
        <div className="space-y-4">
          {/* URL parts */}
          <div className="bg-bg-surface border border-border divide-y divide-border">
            {fields.map((field) => (
              <div
                key={field.key}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-text-tertiary font-medium uppercase tracking-wider shrink-0 w-24">
                    {field.label}
                  </span>
                  <span className="font-mono text-sm text-text-primary truncate">
                    {field.value || <span className="text-text-tertiary italic">(empty)</span>}
                  </span>
                </div>
                {field.value && field.value !== "(default)" && (
                  <CopyBtn value={field.value} field={field.key} />
                )}
              </div>
            ))}
          </div>

          {/* Query Parameters */}
          {parsed.params.length > 0 && (
            <div className="bg-bg-surface border border-border p-5">
              <h2 className="font-heading font-semibold text-sm mb-3">
                Query Parameters ({parsed.params.length})
              </h2>
              <div className="space-y-2">
                {parsed.params.map(([key, value], i) => (
                  <div
                    key={`${key}-${i}`}
                    className="flex items-center gap-3 bg-bg-elevated px-3 py-2"
                  >
                    <span className="font-mono text-xs text-accent font-semibold shrink-0">
                      {key}
                    </span>
                    <span className="text-text-tertiary">=</span>
                    <span className="font-mono text-xs text-text-secondary truncate flex-1">
                      {value}
                    </span>
                    <CopyBtn value={value} field={`param-${key}-${i}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
