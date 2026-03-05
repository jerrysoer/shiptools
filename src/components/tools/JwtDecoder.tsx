"use client";

import { useState, useMemo } from "react";
import { FileKey, AlertTriangle, Copy, CheckCircle, Clock, User, Building, Tag } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { highlightJson } from "@/lib/tools/json-highlight";

interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signatureHex: string;
}

/** Base64url decode → UTF-8 string. */
function base64UrlDecode(str: string): string {
  // Replace base64url chars with standard base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Pad with '='
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const bytes = atob(base64);
  // Decode as UTF-8
  const uint8 = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    uint8[i] = bytes.charCodeAt(i);
  }
  return new TextDecoder().decode(uint8);
}

/** Convert base64url to hex string for the signature. */
function base64UrlToHex(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const bytes = atob(base64);
  return Array.from(bytes, (b) =>
    b.charCodeAt(0).toString(16).padStart(2, "0")
  ).join("");
}

function decodeJwt(token: string): DecodedJwt | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3) return null;

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    const signatureHex = base64UrlToHex(parts[2]);
    return { header, payload, signatureHex };
  } catch {
    return null;
  }
}

function formatTimestamp(epoch: number): string {
  return new Date(epoch * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "long",
  });
}

function ClaimRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="w-4 h-4 text-text-tertiary mt-0.5 shrink-0" />
      <span className="text-text-tertiary w-12 shrink-0">{label}</span>
      <span className="text-text-primary font-mono break-all">{value}</span>
    </div>
  );
}

export default function JwtDecoder() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState<"header" | "payload" | null>(null);

  const decoded = useMemo(() => {
    if (!input.trim()) return null;
    return decodeJwt(input);
  }, [input]);

  const expiry = useMemo(() => {
    if (!decoded?.payload.exp || typeof decoded.payload.exp !== "number") return null;
    const exp = decoded.payload.exp;
    const now = Math.floor(Date.now() / 1000);
    return {
      timestamp: exp,
      date: formatTimestamp(exp),
      isExpired: now > exp,
      remaining: exp - now,
    };
  }, [decoded]);

  async function handleCopy(section: "header" | "payload") {
    if (!decoded) return;
    const json = JSON.stringify(
      section === "header" ? decoded.header : decoded.payload,
      null,
      2
    );
    await navigator.clipboard.writeText(json);
    setCopied(section);
    setTimeout(() => setCopied(null), 2000);
  }

  const isInvalidInput = input.trim().length > 0 && decoded === null;

  return (
    <div>
      <ToolPageHeader
        icon={FileKey}
        title="JWT Decoder"
        description="Paste a JWT token to decode its header, payload, and signature. Inspect claims and check expiry status."
      />
      <div className="space-y-4">

      {/* Warning Banner */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>
          Decodes only — does <strong>NOT</strong> verify the signature.
        </span>
      </div>

      {/* Input */}
      <div className="bg-bg-surface border border-border rounded-xl p-4">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Paste JWT token
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0..."
          rows={4}
          className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-3 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent resize-y break-all"
        />
        {isInvalidInput && (
          <p className="mt-2 text-grade-f text-xs">
            Invalid JWT — expected three base64url segments separated by dots.
          </p>
        )}
      </div>

      {/* Decoded Output */}
      {decoded && (
        <>
          {/* Expiry Badge */}
          {expiry && (
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium ${
                expiry.isExpired
                  ? "bg-grade-f/10 border-grade-f/20 text-grade-f"
                  : "bg-grade-a/10 border-grade-a/20 text-grade-a"
              }`}
            >
              {expiry.isExpired ? (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 shrink-0" />
              )}
              <span>
                {expiry.isExpired ? `Expired — expired ${expiry.date}` : `Valid — expires ${expiry.date}`}
              </span>
            </div>
          )}

          {/* Claims Summary */}
          {("sub" in decoded.payload ||
            "iss" in decoded.payload ||
            "iat" in decoded.payload) && (
            <div className="bg-bg-surface border border-border rounded-xl p-4 space-y-2.5">
              <h3 className="font-heading font-semibold text-sm mb-3">
                Claims
              </h3>
              {"sub" in decoded.payload && (
                <ClaimRow
                  icon={User}
                  label="sub"
                  value={String(decoded.payload.sub)}
                />
              )}
              {"iss" in decoded.payload && (
                <ClaimRow
                  icon={Building}
                  label="iss"
                  value={String(decoded.payload.iss)}
                />
              )}
              {typeof decoded.payload.iat === "number" && (
                <ClaimRow
                  icon={Clock}
                  label="iat"
                  value={formatTimestamp(decoded.payload.iat)}
                />
              )}
              {typeof decoded.payload.exp === "number" && (
                <ClaimRow
                  icon={Clock}
                  label="exp"
                  value={formatTimestamp(decoded.payload.exp)}
                />
              )}
              {"alg" in decoded.header && (
                <ClaimRow
                  icon={Tag}
                  label="alg"
                  value={String(decoded.header.alg)}
                />
              )}
            </div>
          )}

          {/* Header */}
          <JsonSection
            title="Header"
            data={decoded.header}
            copied={copied === "header"}
            onCopy={() => handleCopy("header")}
          />

          {/* Payload */}
          <JsonSection
            title="Payload"
            data={decoded.payload}
            copied={copied === "payload"}
            onCopy={() => handleCopy("payload")}
          />

          {/* Signature */}
          <div className="bg-bg-surface border border-border rounded-xl p-4">
            <h3 className="font-heading font-semibold text-sm mb-2">
              Signature (hex)
            </h3>
            <div className="bg-bg-elevated border border-border rounded-lg p-4 font-mono text-xs text-text-secondary break-all leading-relaxed">
              {decoded.signatureHex}
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

function JsonSection({
  title,
  data,
  copied,
  onCopy,
}: {
  title: string;
  data: Record<string, unknown>;
  copied: boolean;
  onCopy: () => void;
}) {
  const prettyJson = JSON.stringify(data, null, 2);
  const highlighted = highlightJson(prettyJson);

  return (
    <div className="bg-bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-heading font-semibold text-sm">{title}</h3>
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          {copied ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-grade-a" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre
        className="bg-bg-elevated border border-border rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}
