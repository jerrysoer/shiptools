"use client";

import { useState, useCallback, useEffect } from "react";
import { KeyRound, Copy, Check, RefreshCw } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import wordlist from "@/lib/data/eff-wordlist.json";

type Mode = "random" | "passphrase";

interface StrengthResult {
  score: number;
  crackTime: string;
}

const CHARSETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}|;:,.<>?/~`",
} as const;

type CharsetKey = keyof typeof CHARSETS;

const STRENGTH_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-green-500",
];

const STRENGTH_LABELS = [
  "Very weak",
  "Weak",
  "Fair",
  "Strong",
  "Very strong",
];

function secureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

function generateRandomPassword(
  length: number,
  charsets: Record<CharsetKey, boolean>
): string {
  const pool = (Object.keys(charsets) as CharsetKey[])
    .filter((k) => charsets[k])
    .map((k) => CHARSETS[k])
    .join("");

  if (pool.length === 0) return "";

  const chars: string[] = [];
  for (let i = 0; i < length; i++) {
    chars.push(pool[secureRandomInt(pool.length)]);
  }
  return chars.join("");
}

function generatePassphrase(wordCount: number, separator: string): string {
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(wordlist[secureRandomInt(wordlist.length)]);
  }
  return words.join(separator);
}

export default function PasswordGenerator() {
  const [mode, setMode] = useState<Mode>("random");
  const [length, setLength] = useState(20);
  const [wordCount, setWordCount] = useState(5);
  const [separator, setSeparator] = useState("-");
  const [charsets, setCharsets] = useState<Record<CharsetKey, boolean>>({
    uppercase: true,
    lowercase: true,
    digits: true,
    symbols: true,
  });
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [strength, setStrength] = useState<StrengthResult | null>(null);

  const generate = useCallback(() => {
    const pw =
      mode === "random"
        ? generateRandomPassword(length, charsets)
        : generatePassphrase(wordCount, separator);
    setPassword(pw);
    setCopied(false);
  }, [mode, length, charsets, wordCount, separator]);

  // Evaluate strength with zxcvbn (lazy-loaded)
  useEffect(() => {
    if (!password) {
      setStrength(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { default: zxcvbn } = await import("zxcvbn");
      if (cancelled) return;
      const result = zxcvbn(password);
      setStrength({
        score: result.score,
        crackTime:
          result.crack_times_display.offline_slow_hashing_1e4_per_second as string,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [password]);

  // Generate on mount and when settings change
  useEffect(() => {
    generate();
  }, [generate]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleCharset = (key: CharsetKey) => {
    const next = { ...charsets, [key]: !charsets[key] };
    // Ensure at least one charset is selected
    if (Object.values(next).some(Boolean)) {
      setCharsets(next);
    }
  };

  return (
    <div>
      <ToolPageHeader
        icon={KeyRound}
        title="Password Generator"
        description="Generate strong passwords and passphrases using cryptographic randomness."
      />

      {/* Mode Toggle */}
      <div className="bg-bg-surface border border-border rounded-xl p-1 flex mb-6">
        <button
          onClick={() => setMode("random")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "random"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Random Characters
        </button>
        <button
          onClick={() => setMode("passphrase")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "passphrase"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Passphrase
        </button>
      </div>

      {/* Generated Password Display */}
      <div className="bg-bg-surface border border-border rounded-xl p-6 mb-6">
        <div
          className="font-mono text-lg break-all text-center min-h-[3rem] flex items-center justify-center select-all"
          aria-live="polite"
        >
          {password || (
            <span className="text-text-tertiary">
              Select at least one character set
            </span>
          )}
        </div>

        {/* Strength Meter */}
        {strength && (
          <div className="mt-4">
            <div className="flex gap-1 mb-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= strength.score
                      ? STRENGTH_COLORS[strength.score]
                      : "bg-border"
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-text-tertiary">
              <span>{STRENGTH_LABELS[strength.score]}</span>
              <span>Crack time: {strength.crackTime}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleCopy}
            disabled={!password}
            className="flex-1 flex items-center justify-center gap-2 bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={generate}
            className="flex items-center justify-center gap-2 bg-bg-elevated border border-border px-4 py-2 rounded-lg hover:bg-bg-surface transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-bg-surface border border-border rounded-xl p-6">
        <h2 className="font-heading font-semibold mb-4">Settings</h2>

        {mode === "random" ? (
          <>
            {/* Length Slider */}
            <div className="mb-5">
              <div className="flex justify-between mb-2">
                <label className="text-sm text-text-secondary">Length</label>
                <span className="text-sm font-mono text-text-primary">
                  {length}
                </span>
              </div>
              <input
                type="range"
                min={8}
                max={128}
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-xs text-text-tertiary mt-1">
                <span>8</span>
                <span>128</span>
              </div>
            </div>

            {/* Charset Checkboxes */}
            <div className="space-y-2.5">
              <label className="text-sm text-text-secondary block mb-1">
                Character Sets
              </label>
              {(Object.keys(CHARSETS) as CharsetKey[]).map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={charsets[key]}
                    onChange={() => toggleCharset(key)}
                    className="accent-accent w-4 h-4"
                  />
                  <span className="text-sm capitalize">{key}</span>
                  <span className="text-xs text-text-tertiary font-mono ml-auto">
                    {CHARSETS[key].slice(0, 16)}
                    {CHARSETS[key].length > 16 ? "..." : ""}
                  </span>
                </label>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Word Count */}
            <div className="mb-5">
              <div className="flex justify-between mb-2">
                <label className="text-sm text-text-secondary">
                  Word Count
                </label>
                <span className="text-sm font-mono text-text-primary">
                  {wordCount}
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={10}
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-xs text-text-tertiary mt-1">
                <span>3</span>
                <span>10</span>
              </div>
            </div>

            {/* Separator */}
            <div>
              <label className="text-sm text-text-secondary block mb-2">
                Separator
              </label>
              <div className="flex gap-2">
                {["-", ".", " ", "_"].map((sep) => (
                  <button
                    key={sep}
                    onClick={() => setSeparator(sep)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-mono border transition-colors ${
                      separator === sep
                        ? "bg-accent text-white border-accent"
                        : "bg-bg-elevated border-border hover:border-border-hover"
                    }`}
                  >
                    {sep === " " ? "space" : sep}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
