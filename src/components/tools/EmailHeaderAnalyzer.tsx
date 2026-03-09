"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Mail,
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Clock,
  Server,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

interface HeaderField {
  name: string;
  value: string;
}

interface Hop {
  from: string;
  by: string;
  date: string;
  timestamp: number;
  ip: string;
  protocol: string;
}

interface AuthResult {
  status: "pass" | "fail" | "none" | "neutral" | "softfail";
  detail: string;
}

interface ParsedHeaders {
  fields: HeaderField[];
  hops: Hop[];
  spf: AuthResult;
  dkim: AuthResult;
  dmarc: AuthResult;
  from: string;
  to: string;
  subject: string;
  date: string;
  messageId: string;
  returnPath: string;
}

function parseHeaders(raw: string): ParsedHeaders {
  // Unfold continuation lines (lines starting with whitespace are continuations)
  const unfolded = raw.replace(/\r?\n(?=[ \t])/g, " ");
  const lines = unfolded.split(/\r?\n/).filter((l) => l.trim());

  const fields: HeaderField[] = [];
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      fields.push({
        name: line.slice(0, colonIdx).trim(),
        value: line.slice(colonIdx + 1).trim(),
      });
    }
  }

  const getField = (name: string): string =>
    fields.find((f) => f.name.toLowerCase() === name.toLowerCase())?.value || "";

  // Parse Received headers (they appear top-to-bottom = newest first)
  const receivedFields = fields.filter(
    (f) => f.name.toLowerCase() === "received"
  );

  const hops: Hop[] = receivedFields
    .map((f) => {
      const val = f.value;

      // Extract "from <host>"
      const fromMatch = val.match(/from\s+([\w.\-[\]]+)/i);
      // Extract "by <host>"
      const byMatch = val.match(/by\s+([\w.\-[\]]+)/i);
      // Extract date (after the last semicolon)
      const dateMatch = val.match(/;\s*(.+)$/);
      // Extract IP addresses
      const ipMatch = val.match(
        /\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/
      ) || val.match(/\((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\)/);
      // Extract protocol
      const protoMatch = val.match(/with\s+(\w+)/i);

      const dateStr = dateMatch?.[1]?.trim() || "";
      const ts = dateStr ? new Date(dateStr).getTime() : 0;

      return {
        from: fromMatch?.[1] || "unknown",
        by: byMatch?.[1] || "unknown",
        date: dateStr,
        timestamp: isNaN(ts) ? 0 : ts,
        ip: ipMatch?.[1] || "",
        protocol: protoMatch?.[1] || "",
      };
    })
    .reverse(); // Reverse to show chronological order (oldest first)

  // Parse auth results
  function parseAuth(headerName: string, keyword: string): AuthResult {
    const header = getField(headerName);
    if (!header) return { status: "none", detail: "Not present" };

    const lower = header.toLowerCase();
    if (lower.includes(`${keyword}=pass`))
      return { status: "pass", detail: header };
    if (lower.includes(`${keyword}=fail`))
      return { status: "fail", detail: header };
    if (lower.includes(`${keyword}=softfail`))
      return { status: "softfail", detail: header };
    if (lower.includes(`${keyword}=neutral`))
      return { status: "neutral", detail: header };
    if (lower.includes("pass"))
      return { status: "pass", detail: header };
    if (lower.includes("fail"))
      return { status: "fail", detail: header };

    return { status: "none", detail: header };
  }

  // SPF from Received-SPF or Authentication-Results
  let spf = parseAuth("Received-SPF", "spf");
  if (spf.status === "none") {
    spf = parseAuth("Authentication-Results", "spf");
  }

  // DKIM
  const dkimSig = getField("DKIM-Signature");
  let dkim: AuthResult;
  if (dkimSig) {
    const authResults = getField("Authentication-Results").toLowerCase();
    if (authResults.includes("dkim=pass")) {
      dkim = { status: "pass", detail: "DKIM signature verified" };
    } else if (authResults.includes("dkim=fail")) {
      dkim = { status: "fail", detail: "DKIM signature failed" };
    } else {
      dkim = { status: "neutral", detail: "DKIM signature present but status unclear" };
    }
  } else {
    dkim = { status: "none", detail: "No DKIM-Signature header" };
  }

  // DMARC from Authentication-Results
  const dmarc = parseAuth("Authentication-Results", "dmarc");

  return {
    fields,
    hops,
    spf,
    dkim,
    dmarc,
    from: getField("From"),
    to: getField("To"),
    subject: getField("Subject"),
    date: getField("Date"),
    messageId: getField("Message-ID") || getField("Message-Id"),
    returnPath: getField("Return-Path"),
  };
}

function AuthBadge({ label, result }: { label: string; result: AuthResult }) {
  const config = {
    pass: {
      icon: ShieldCheck,
      bg: "bg-grade-a/10",
      text: "text-grade-a",
      label: "Pass",
    },
    fail: {
      icon: ShieldX,
      bg: "bg-grade-f/10",
      text: "text-grade-f",
      label: "Fail",
    },
    softfail: {
      icon: ShieldAlert,
      bg: "bg-yellow-500/10",
      text: "text-yellow-600 dark:text-yellow-400",
      label: "Soft Fail",
    },
    neutral: {
      icon: Shield,
      bg: "bg-yellow-500/10",
      text: "text-yellow-600 dark:text-yellow-400",
      label: "Neutral",
    },
    none: {
      icon: Shield,
      bg: "bg-bg-elevated",
      text: "text-text-tertiary",
      label: "Not Found",
    },
  }[result.status];

  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 ${config.bg}`}>
      <Icon className={`w-4 h-4 ${config.text}`} />
      <div>
        <span className={`text-xs font-semibold ${config.text}`}>
          {label}: {config.label}
        </span>
      </div>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1 rounded hover:bg-bg-elevated transition-colors"
      title="Copy"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-grade-a" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-text-tertiary" />
      )}
    </button>
  );
}

export default function EmailHeaderAnalyzer() {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ParsedHeaders | null>(null);
  const [showAllFields, setShowAllFields] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "email-headers" });
  }, []);

  const handleAnalyze = useCallback(() => {
    if (!raw.trim()) return;
    const result = parseHeaders(raw);
    setParsed(result);
    trackEvent("tool_used", { tool: "email-headers", hops: result.hops.length });
  }, [raw]);

  return (
    <div>
      <ToolPageHeader
        icon={Mail}
        title="Email Header Analyzer"
        description="Parse raw email headers to trace server hops and verify authentication."
      />

      {/* Input */}
      <div className="bg-bg-surface border border-border p-5 mb-6">
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste raw email headers here..."
          className="w-full h-48 bg-transparent text-sm font-mono resize-none outline-none placeholder:text-text-tertiary"
        />
        <button
          onClick={handleAnalyze}
          disabled={!raw.trim()}
          className="mt-3 px-5 py-2 bg-accent text-accent-fg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Analyze Headers
        </button>
      </div>

      {parsed && (
        <div className="space-y-4">
          {/* Authentication */}
          <div className="bg-bg-surface border border-border p-5">
            <h2 className="font-heading font-semibold mb-3">Authentication</h2>
            <div className="grid grid-cols-3 gap-2">
              <AuthBadge label="SPF" result={parsed.spf} />
              <AuthBadge label="DKIM" result={parsed.dkim} />
              <AuthBadge label="DMARC" result={parsed.dmarc} />
            </div>
          </div>

          {/* Key Fields */}
          <div className="bg-bg-surface border border-border divide-y divide-border">
            {[
              { label: "From", value: parsed.from },
              { label: "To", value: parsed.to },
              { label: "Subject", value: parsed.subject },
              { label: "Date", value: parsed.date },
              { label: "Return-Path", value: parsed.returnPath },
              { label: "Message-ID", value: parsed.messageId },
            ]
              .filter((f) => f.value)
              .map((f) => (
                <div key={f.label} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-text-tertiary text-xs font-medium w-24 shrink-0">
                    {f.label}
                  </span>
                  <span className="flex-1 font-mono text-xs text-text-primary break-all">
                    {f.value}
                  </span>
                  <CopyButton value={f.value} />
                </div>
              ))}
          </div>

          {/* Hop Timeline */}
          {parsed.hops.length > 0 && (
            <div className="bg-bg-surface border border-border p-5">
              <h2 className="font-heading font-semibold mb-4">
                Server Hops ({parsed.hops.length})
              </h2>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

                <div className="space-y-4">
                  {parsed.hops.map((hop, i) => {
                    const delay =
                      i > 0 && hop.timestamp && parsed.hops[i - 1].timestamp
                        ? Math.round(
                            (hop.timestamp - parsed.hops[i - 1].timestamp) / 1000
                          )
                        : null;

                    return (
                      <div key={i} className="relative pl-8">
                        {/* Dot */}
                        <div
                          className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 ${
                            i === parsed.hops.length - 1
                              ? "bg-accent border-accent"
                              : "bg-bg-primary border-border"
                          }`}
                        />

                        <div className="text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Server className="w-3.5 h-3.5 text-text-tertiary" />
                            <span className="font-mono text-text-primary">
                              {hop.by}
                            </span>
                            {hop.protocol && (
                              <span className="px-1.5 py-0.5 bg-bg-elevated rounded text-[10px] font-mono text-text-tertiary uppercase">
                                {hop.protocol}
                              </span>
                            )}
                            {delay !== null && delay > 0 && (
                              <span className="flex items-center gap-1 text-xs text-text-tertiary">
                                <Clock className="w-3 h-3" />
                                +{delay}s
                              </span>
                            )}
                          </div>
                          {hop.from !== "unknown" && (
                            <div className="text-xs text-text-tertiary mt-0.5">
                              from {hop.from}
                              {hop.ip && ` [${hop.ip}]`}
                            </div>
                          )}
                          {hop.date && (
                            <div className="text-xs text-text-tertiary">
                              {hop.date}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* All Headers */}
          <div className="bg-bg-surface border border-border">
            <button
              onClick={() => setShowAllFields(!showAllFields)}
              className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              All Headers ({parsed.fields.length})
              {showAllFields ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {showAllFields && (
              <div className="border-t border-border divide-y divide-border max-h-64 overflow-y-auto">
                {parsed.fields.map((f, i) => (
                  <div key={i} className="flex gap-3 px-4 py-2 text-xs">
                    <span className="text-text-tertiary font-medium w-40 shrink-0 truncate">
                      {f.name}
                    </span>
                    <span className="font-mono text-text-secondary break-all flex-1">
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
