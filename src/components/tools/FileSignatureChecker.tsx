"use client";

import { useState, useCallback, useEffect } from "react";
import { FileSearch, Upload, AlertTriangle, Check, HelpCircle } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

interface Signature {
  name: string;
  extensions: string[];
  magic: number[];
  offset?: number;
  mask?: number[]; // optional mask for partial matching
}

const SIGNATURES: Signature[] = [
  { name: "PNG", extensions: ["png"], magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { name: "JPEG", extensions: ["jpg", "jpeg"], magic: [0xff, 0xd8, 0xff] },
  { name: "GIF87a", extensions: ["gif"], magic: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] },
  { name: "GIF89a", extensions: ["gif"], magic: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] },
  { name: "PDF", extensions: ["pdf"], magic: [0x25, 0x50, 0x44, 0x46] },
  { name: "ZIP", extensions: ["zip", "jar", "apk", "docx", "xlsx", "pptx"], magic: [0x50, 0x4b, 0x03, 0x04] },
  { name: "RAR", extensions: ["rar"], magic: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07] },
  { name: "7-Zip", extensions: ["7z"], magic: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] },
  { name: "GZIP", extensions: ["gz", "tgz"], magic: [0x1f, 0x8b] },
  { name: "BZ2", extensions: ["bz2"], magic: [0x42, 0x5a, 0x68] },
  { name: "MP3 (ID3)", extensions: ["mp3"], magic: [0x49, 0x44, 0x33] },
  { name: "MP3 (sync)", extensions: ["mp3"], magic: [0xff, 0xfb] },
  { name: "OGG", extensions: ["ogg", "oga", "ogv"], magic: [0x4f, 0x67, 0x67, 0x53] },
  { name: "FLAC", extensions: ["flac"], magic: [0x66, 0x4c, 0x61, 0x43] },
  { name: "WAV", extensions: ["wav"], magic: [0x52, 0x49, 0x46, 0x46] },
  { name: "WebP", extensions: ["webp"], magic: [0x52, 0x49, 0x46, 0x46] },
  { name: "AVI", extensions: ["avi"], magic: [0x52, 0x49, 0x46, 0x46] },
  { name: "EXE / DLL", extensions: ["exe", "dll", "sys"], magic: [0x4d, 0x5a] },
  { name: "ELF", extensions: ["elf", "so", "o"], magic: [0x7f, 0x45, 0x4c, 0x46] },
  { name: "Mach-O (64)", extensions: ["dylib", "app"], magic: [0xcf, 0xfa, 0xed, 0xfe] },
  { name: "Mach-O (32)", extensions: ["dylib", "app"], magic: [0xce, 0xfa, 0xed, 0xfe] },
  { name: "WebAssembly", extensions: ["wasm"], magic: [0x00, 0x61, 0x73, 0x6d] },
  { name: "SQLite", extensions: ["db", "sqlite", "sqlite3"], magic: [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65] },
  { name: "TIFF (LE)", extensions: ["tiff", "tif"], magic: [0x49, 0x49, 0x2a, 0x00] },
  { name: "TIFF (BE)", extensions: ["tiff", "tif"], magic: [0x4d, 0x4d, 0x00, 0x2a] },
  { name: "BMP", extensions: ["bmp"], magic: [0x42, 0x4d] },
  { name: "ICO", extensions: ["ico"], magic: [0x00, 0x00, 0x01, 0x00] },
  { name: "PSD", extensions: ["psd"], magic: [0x38, 0x42, 0x50, 0x53] },
  { name: "XML", extensions: ["xml", "svg", "html"], magic: [0x3c, 0x3f, 0x78, 0x6d, 0x6c] },
  { name: "Class (Java)", extensions: ["class"], magic: [0xca, 0xfe, 0xba, 0xbe] },
];

interface DetectedType {
  name: string;
  extensions: string[];
  confidence: "high" | "medium";
}

function detectType(bytes: Uint8Array): DetectedType | null {
  // Special case: MP4/MOV — "ftyp" at offset 4
  if (bytes.length >= 8) {
    const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    if (ftyp === "ftyp") {
      return { name: "MP4 / MOV", extensions: ["mp4", "m4a", "m4v", "mov"], confidence: "high" };
    }
  }

  // Special case: RIFF-based formats (WAV vs WebP vs AVI)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
  ) {
    const subtype = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (subtype === "WEBP") return { name: "WebP", extensions: ["webp"], confidence: "high" };
    if (subtype === "WAVE") return { name: "WAV", extensions: ["wav"], confidence: "high" };
    if (subtype === "AVI ") return { name: "AVI", extensions: ["avi"], confidence: "high" };
    return { name: "RIFF (unknown)", extensions: [], confidence: "medium" };
  }

  // Match against signature database
  for (const sig of SIGNATURES) {
    // Skip RIFF-based (handled above)
    if (sig.magic[0] === 0x52 && sig.magic[1] === 0x49 && sig.magic[2] === 0x46 && sig.magic[3] === 0x46)
      continue;

    const offset = sig.offset || 0;
    if (bytes.length < offset + sig.magic.length) continue;

    let match = true;
    for (let i = 0; i < sig.magic.length; i++) {
      const b = sig.mask ? bytes[offset + i] & sig.mask[i] : bytes[offset + i];
      const expected = sig.mask ? sig.magic[i] & sig.mask[i] : sig.magic[i];
      if (b !== expected) {
        match = false;
        break;
      }
    }

    if (match) {
      return { name: sig.name, extensions: sig.extensions, confidence: "high" };
    }
  }

  // Check if it looks like text
  let isText = true;
  const checkLen = Math.min(bytes.length, 512);
  for (let i = 0; i < checkLen; i++) {
    const b = bytes[i];
    if (b === 0) {
      isText = false;
      break;
    }
  }
  if (isText && bytes.length > 0) {
    return { name: "Plain Text", extensions: ["txt", "csv", "log", "md"], confidence: "medium" };
  }

  return null;
}

function formatHex(bytes: Uint8Array, count: number): string[] {
  const result: string[] = [];
  const len = Math.min(bytes.length, count);
  for (let i = 0; i < len; i++) {
    result.push(bytes[i].toString(16).padStart(2, "0").toUpperCase());
  }
  return result;
}

function formatAscii(bytes: Uint8Array, count: number): string {
  const len = Math.min(bytes.length, count);
  let result = "";
  for (let i = 0; i < len; i++) {
    const b = bytes[i];
    result += b >= 32 && b <= 126 ? String.fromCharCode(b) : ".";
  }
  return result;
}

export default function FileSignatureChecker() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileExt, setFileExt] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [detected, setDetected] = useState<DetectedType | null>(null);
  const [hexBytes, setHexBytes] = useState<string[]>([]);
  const [asciiPreview, setAsciiPreview] = useState("");
  const [mismatch, setMismatch] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "file-signature" });
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(file.size);
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    setFileExt(ext);

    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(buffer.slice(0, 32));

      const type = detectType(new Uint8Array(buffer.slice(0, 512)));
      setDetected(type);
      setHexBytes(formatHex(bytes, 16));
      setAsciiPreview(formatAscii(bytes, 16));

      // Check extension mismatch
      if (type && ext) {
        const normalizedExts = type.extensions.map((e) => e.toLowerCase());
        setMismatch(!normalizedExts.includes(ext) && normalizedExts.length > 0);
      } else {
        setMismatch(false);
      }

      trackEvent("tool_used", {
        tool: "file-signature",
        detected: type?.name || "unknown",
        mismatch: type
          ? !type.extensions.map((e) => e.toLowerCase()).includes(ext) && type.extensions.length > 0
          : false,
      });
    };
    reader.readAsArrayBuffer(file);

    // Reset input
    e.target.value = "";
  }, []);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div>
      <ToolPageHeader
        icon={FileSearch}
        title="File Signature Checker"
        description="Verify file types by inspecting magic bytes. Detect extension mismatches."
      />

      {/* Upload */}
      <div className="bg-bg-surface border border-border rounded-xl p-6 mb-6">
        <label className="flex flex-col items-center gap-3 cursor-pointer">
          <div className="p-3 rounded-xl bg-accent/10">
            <Upload className="w-6 h-6 text-accent" />
          </div>
          <span className="text-text-secondary text-sm">
            {fileName || "Upload any file to inspect its signature"}
          </span>
          <input type="file" accept="*/*" onChange={handleFile} className="hidden" />
          {!fileName && (
            <span className="text-xs text-text-tertiary">Any file type</span>
          )}
        </label>
      </div>

      {detected && fileName && (
        <div className="space-y-4">
          {/* Detection Result */}
          <div
            className={`bg-bg-surface border rounded-xl p-5 ${
              mismatch ? "border-grade-f/50" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-heading font-semibold text-lg">{detected.name}</h2>
                <p className="text-text-secondary text-sm mt-0.5">
                  Confidence: {detected.confidence === "high" ? "High" : "Medium"}
                </p>
              </div>
              {mismatch ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-grade-f/10 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-grade-f" />
                  <span className="text-xs font-medium text-grade-f">Extension mismatch</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-grade-a/10 rounded-lg">
                  <Check className="w-3.5 h-3.5 text-grade-a" />
                  <span className="text-xs font-medium text-grade-a">Extension matches</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-text-tertiary text-xs">File name</span>
                <p className="font-mono text-text-primary truncate">{fileName}</p>
              </div>
              <div>
                <span className="text-text-tertiary text-xs">File size</span>
                <p className="font-mono text-text-primary">{formatSize(fileSize)}</p>
              </div>
              <div>
                <span className="text-text-tertiary text-xs">Extension</span>
                <p className="font-mono text-text-primary">.{fileExt || "(none)"}</p>
              </div>
              <div>
                <span className="text-text-tertiary text-xs">Expected extensions</span>
                <p className="font-mono text-text-primary">
                  {detected.extensions.length > 0
                    ? detected.extensions.map((e) => `.${e}`).join(", ")
                    : "—"}
                </p>
              </div>
            </div>

            {mismatch && (
              <div className="mt-4 p-3 bg-grade-f/5 border border-grade-f/20 rounded-lg text-sm text-grade-f">
                <strong>Warning:</strong> The file extension <code>.{fileExt}</code>{" "}
                does not match the detected type ({detected.name}). This file may have
                been renamed or could be disguised.
              </div>
            )}
          </div>

          {/* Hex Dump */}
          <div className="bg-bg-surface border border-border rounded-xl p-5">
            <h3 className="font-heading font-semibold text-sm mb-3">
              Hex Dump (first 16 bytes)
            </h3>
            <div className="bg-bg-primary border border-border rounded-lg p-4 font-mono text-xs">
              <div className="flex gap-1 mb-2">
                <span className="text-text-tertiary w-16 shrink-0">Offset</span>
                {Array.from({ length: 16 }, (_, i) => (
                  <span
                    key={i}
                    className="w-7 text-center text-text-tertiary"
                  >
                    {i.toString(16).toUpperCase().padStart(2, "0")}
                  </span>
                ))}
                <span className="ml-2 text-text-tertiary">ASCII</span>
              </div>
              <div className="flex gap-1">
                <span className="text-text-tertiary w-16 shrink-0">00000000</span>
                {hexBytes.map((b, i) => (
                  <span
                    key={i}
                    className={`w-7 text-center ${
                      i < (detected ? SIGNATURES.find((s) => s.name === detected.name)?.magic.length || 0 : 0)
                        ? "text-accent font-semibold"
                        : "text-text-primary"
                    }`}
                  >
                    {b}
                  </span>
                ))}
                {/* Pad remaining */}
                {Array.from({ length: Math.max(0, 16 - hexBytes.length) }, (_, i) => (
                  <span key={`pad-${i}`} className="w-7 text-center text-text-tertiary">
                    ..
                  </span>
                ))}
                <span className="ml-2 text-text-secondary">{asciiPreview}</span>
              </div>
            </div>
          </div>

          {/* Known signatures reference */}
          <details className="bg-bg-surface border border-border rounded-xl">
            <summary className="px-5 py-3 text-sm font-medium text-text-secondary cursor-pointer hover:text-text-primary">
              <span className="inline-flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                Known signatures ({SIGNATURES.length + 1})
              </span>
            </summary>
            <div className="border-t border-border px-5 py-3 max-h-60 overflow-y-auto">
              <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-xs font-mono">
                {[...SIGNATURES, { name: "MP4/MOV", extensions: ["mp4", "mov"], magic: [] as number[] }].map(
                  (sig, i) => (
                    <div key={i} className="contents">
                      <span className="text-text-primary">{sig.name}</span>
                      <span className="text-text-tertiary">
                        {sig.magic.length > 0
                          ? sig.magic
                              .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
                              .join(" ")
                          : "ftyp @ offset 4"}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </details>
        </div>
      )}

      {/* No file yet */}
      {!fileName && (
        <div className="text-center text-text-tertiary text-xs mt-4">
          Your file is read locally and never uploaded. Only the first bytes are inspected.
        </div>
      )}
    </div>
  );
}
