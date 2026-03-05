"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Hash, Copy, Check, CheckCircle, XCircle, FileText, Type } from "lucide-react";
import DropZone from "@/components/DropZone";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

type Mode = "text" | "file";

interface HashResults {
  md5: string;
  "sha-1": string;
  "sha-256": string;
  "sha-512": string;
}

const EMPTY_HASHES: HashResults = {
  md5: "",
  "sha-1": "",
  "sha-256": "",
  "sha-512": "",
};

const HASH_LABELS: { key: keyof HashResults; label: string }[] = [
  { key: "md5", label: "MD5" },
  { key: "sha-1", label: "SHA-1" },
  { key: "sha-256", label: "SHA-256" },
  { key: "sha-512", label: "SHA-512" },
];

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function computeHashes(data: ArrayBuffer): Promise<HashResults> {
  const SparkMD5 = (await import("spark-md5")).default;

  const spark = new SparkMD5.ArrayBuffer();
  spark.append(data);
  const md5 = spark.end();

  const [sha1, sha256, sha512] = await Promise.all([
    crypto.subtle.digest("SHA-1", data).then(bufToHex),
    crypto.subtle.digest("SHA-256", data).then(bufToHex),
    crypto.subtle.digest("SHA-512", data).then(bufToHex),
  ]);

  return { md5, "sha-1": sha1, "sha-256": sha256, "sha-512": sha512 };
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <button
      onClick={handleCopy}
      disabled={!value}
      className="p-1.5 rounded-md hover:bg-bg-elevated transition-colors disabled:opacity-30"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-grade-a" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-text-tertiary" />
      )}
    </button>
  );
}

function VerifyBadge({
  expected,
  hashes,
}: {
  expected: string;
  hashes: HashResults;
}) {
  const normalized = expected.trim().toLowerCase();
  if (!normalized) return null;

  const match = Object.values(hashes).some(
    (h) => h && h === normalized
  );

  return match ? (
    <div className="flex items-center gap-1.5 text-grade-a text-sm font-medium">
      <CheckCircle className="w-4 h-4" />
      Hash matches
    </div>
  ) : (
    <div className="flex items-center gap-1.5 text-grade-f text-sm font-medium">
      <XCircle className="w-4 h-4" />
      No match found
    </div>
  );
}

export default function HashCalculator() {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [hashes, setHashes] = useState<HashResults>(EMPTY_HASHES);
  const [computing, setComputing] = useState(false);
  const [verifyHash, setVerifyHash] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "hash" });
  }, []);

  // Debounced text hashing
  useEffect(() => {
    if (mode !== "text") return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text) {
      setHashes(EMPTY_HASHES);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setComputing(true);
      const data = new TextEncoder().encode(text).buffer as ArrayBuffer;
      const result = await computeHashes(data);
      setHashes(result);
      setComputing(false);
      trackEvent("tool_used", { tool: "hash", mode: "text" });
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, mode]);

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setFileName(file.name);
    setComputing(true);
    const data = await file.arrayBuffer();
    const result = await computeHashes(data);
    setHashes(result);
    setComputing(false);
    trackEvent("tool_used", { tool: "hash", mode: "file" });
  }, []);

  const handleModeSwitch = useCallback(
    (newMode: Mode) => {
      if (newMode === mode) return;
      setMode(newMode);
      setHashes(EMPTY_HASHES);
      setText("");
      setFileName(null);
      setVerifyHash("");
    },
    [mode]
  );

  const hasResults = Object.values(hashes).some(Boolean);

  return (
    <div>
      <ToolPageHeader
        icon={Hash}
        title="Hash Calculator"
        description="Compute MD5, SHA-1, SHA-256, and SHA-512 hashes for text or files."
      />

      {/* Mode Toggle */}
      <div className="flex gap-1 p-1 bg-bg-surface border border-border rounded-lg mb-6 max-w-xs mx-auto">
        <button
          onClick={() => handleModeSwitch("text")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "text"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Type className="w-4 h-4" />
          Text
        </button>
        <button
          onClick={() => handleModeSwitch("file")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "file"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <FileText className="w-4 h-4" />
          File
        </button>
      </div>

      {/* Input Area */}
      <div className="bg-bg-surface border border-border rounded-xl p-5 mb-6">
        {mode === "text" ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste text to hash..."
            className="w-full h-32 bg-transparent text-sm font-mono resize-none outline-none placeholder:text-text-tertiary"
          />
        ) : (
          <div>
            <DropZone
              accept="*/*"
              maxSize={500 * 1024 * 1024}
              onFiles={handleFiles}
              label="Drop a file here or click to browse"
              multiple={false}
            />
            {fileName && (
              <p className="text-text-secondary text-sm mt-3">
                File: <span className="font-mono text-text-primary">{fileName}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Hash Results */}
      <div className="bg-bg-surface border border-border rounded-xl divide-y divide-border">
        {HASH_LABELS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3 px-5 py-3">
            <span className="text-text-secondary text-xs font-medium w-16 shrink-0">
              {label}
            </span>
            <span
              className={`flex-1 font-mono text-xs break-all ${
                hashes[key]
                  ? "text-text-primary"
                  : "text-text-tertiary"
              }`}
            >
              {computing
                ? "Computing..."
                : hashes[key] || "—"}
            </span>
            <CopyButton value={hashes[key]} />
          </div>
        ))}
      </div>

      {/* Verify Section */}
      {hasResults && (
        <div className="mt-6 bg-bg-surface border border-border rounded-xl p-5">
          <label className="block text-text-secondary text-sm font-medium mb-2">
            Verify checksum
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={verifyHash}
              onChange={(e) => setVerifyHash(e.target.value)}
              placeholder="Paste expected hash to verify..."
              className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-accent placeholder:text-text-tertiary"
            />
            <VerifyBadge expected={verifyHash} hashes={hashes} />
          </div>
        </div>
      )}
    </div>
  );
}
