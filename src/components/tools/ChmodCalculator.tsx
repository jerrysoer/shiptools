"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Copy, Check } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

/* ── Types ───────────────────────────────────── */

type PermissionSet = [boolean, boolean, boolean]; // read, write, execute

interface Permissions {
  owner: PermissionSet;
  group: PermissionSet;
  other: PermissionSet;
}

/* ── Helpers ──────────────────────────────────── */

function permToOctal(perm: PermissionSet): number {
  return (perm[0] ? 4 : 0) + (perm[1] ? 2 : 0) + (perm[2] ? 1 : 0);
}

function permToSymbolic(perm: PermissionSet): string {
  return (perm[0] ? "r" : "-") + (perm[1] ? "w" : "-") + (perm[2] ? "x" : "-");
}

function octalToPerms(octal: number): Permissions {
  const parse = (n: number): PermissionSet => [
    (n & 4) !== 0,
    (n & 2) !== 0,
    (n & 1) !== 0,
  ];
  return {
    owner: parse(Math.floor(octal / 100) % 10),
    group: parse(Math.floor(octal / 10) % 10),
    other: parse(octal % 10),
  };
}

/* ── Presets ──────────────────────────────────── */

const PRESETS = [
  { label: "644", desc: "Default file", octal: 644 },
  { label: "755", desc: "Default directory / script", octal: 755 },
  { label: "600", desc: "Private file", octal: 600 },
  { label: "700", desc: "Private directory", octal: 700 },
  { label: "777", desc: "Full access (unsafe)", octal: 777 },
  { label: "444", desc: "Read-only", octal: 444 },
  { label: "666", desc: "Read/write all", octal: 666 },
  { label: "400", desc: "Owner read-only", octal: 400 },
];

/* ── Component ───────────────────────────────── */

export default function ChmodCalculator() {
  const [perms, setPerms] = useState<Permissions>({
    owner: [true, true, true],
    group: [true, false, true],
    other: [true, false, true],
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "chmod" });
  }, []);

  const numericStr = `${permToOctal(perms.owner)}${permToOctal(perms.group)}${permToOctal(perms.other)}`;
  const symbolicStr = `${permToSymbolic(perms.owner)}${permToSymbolic(perms.group)}${permToSymbolic(perms.other)}`;

  const toggleBit = useCallback(
    (role: keyof Permissions, idx: 0 | 1 | 2) => {
      setPerms((prev) => {
        const next = { ...prev };
        const arr: PermissionSet = [...prev[role]];
        arr[idx] = !arr[idx];
        next[role] = arr;
        return next;
      });
    },
    []
  );

  const applyPreset = useCallback((octal: number) => {
    setPerms(octalToPerms(octal));
    trackEvent("tool_used", { tool: "chmod" });
  }, []);

  const copyValue = useCallback(async (value: string, field: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    trackEvent("tool_used", { tool: "chmod" });
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const CopyBtn = ({ value, field }: { value: string; field: string }) => (
    <button
      onClick={() => copyValue(value, field)}
      className="p-2 rounded-lg bg-bg-elevated border border-border hover:border-border-hover transition-colors shrink-0"
      title={`Copy ${field}`}
    >
      {copiedField === field ? (
        <Check className="w-3.5 h-3.5 text-grade-a" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-text-tertiary" />
      )}
    </button>
  );

  const roles: { key: keyof Permissions; label: string }[] = [
    { key: "owner", label: "Owner" },
    { key: "group", label: "Group" },
    { key: "other", label: "Other" },
  ];

  const bits: { label: string; idx: 0 | 1 | 2 }[] = [
    { label: "Read", idx: 0 },
    { label: "Write", idx: 1 },
    { label: "Execute", idx: 2 },
  ];

  return (
    <div>
      <ToolPageHeader
        icon={Shield}
        title="Chmod Calculator"
        description="Calculate Unix file permissions with a visual checkbox grid. Get numeric and symbolic notation instantly."
      />

      {/* Output */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-bg-surface border border-border rounded-xl p-4">
          <label className="block text-xs text-text-tertiary mb-2 font-medium uppercase tracking-wider">
            Numeric
          </label>
          <div className="flex items-center gap-2">
            <span className="flex-1 font-mono text-2xl text-accent">{numericStr}</span>
            <CopyBtn value={numericStr} field="numeric" />
          </div>
        </div>
        <div className="bg-bg-surface border border-border rounded-xl p-4">
          <label className="block text-xs text-text-tertiary mb-2 font-medium uppercase tracking-wider">
            Symbolic
          </label>
          <div className="flex items-center gap-2">
            <span className="flex-1 font-mono text-2xl text-accent">{symbolicStr}</span>
            <CopyBtn value={symbolicStr} field="symbolic" />
          </div>
        </div>
      </div>

      {/* Chmod command preview */}
      <div className="bg-bg-surface border border-border rounded-xl p-4 mb-6">
        <label className="block text-xs text-text-tertiary mb-2 font-medium uppercase tracking-wider">
          Command
        </label>
        <div className="flex items-center gap-2">
          <code className="flex-1 font-mono text-sm text-text-secondary">
            chmod {numericStr} filename
          </code>
          <CopyBtn value={`chmod ${numericStr} filename`} field="command" />
        </div>
      </div>

      {/* Permission Grid */}
      <div className="bg-bg-surface border border-border rounded-xl p-5 mb-6">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-xs text-text-tertiary font-medium uppercase tracking-wider pb-3" />
              {bits.map((b) => (
                <th
                  key={b.label}
                  className="text-center text-xs text-text-tertiary font-medium uppercase tracking-wider pb-3"
                >
                  {b.label}
                </th>
              ))}
              <th className="text-center text-xs text-text-tertiary font-medium uppercase tracking-wider pb-3">
                Octal
              </th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.key} className="border-t border-border">
                <td className="py-3 text-sm font-medium text-text-primary">
                  {role.label}
                </td>
                {bits.map((b) => (
                  <td key={b.label} className="py-3 text-center">
                    <button
                      onClick={() => toggleBit(role.key, b.idx)}
                      className={`w-8 h-8 rounded-lg border transition-colors ${
                        perms[role.key][b.idx]
                          ? "bg-accent border-accent text-accent-fg"
                          : "bg-bg-elevated border-border text-text-tertiary hover:border-border-hover"
                      }`}
                    >
                      {perms[role.key][b.idx] ? (
                        <span className="text-xs font-bold">
                          {b.idx === 0 ? "r" : b.idx === 1 ? "w" : "x"}
                        </span>
                      ) : (
                        <span className="text-xs">-</span>
                      )}
                    </button>
                  </td>
                ))}
                <td className="py-3 text-center font-mono text-sm text-text-secondary">
                  {permToOctal(perms[role.key])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Presets */}
      <div className="bg-bg-surface border border-border rounded-xl p-5">
        <h2 className="font-heading font-semibold text-sm mb-3">Common Presets</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset.octal)}
              className={`flex flex-col items-start px-3 py-2 rounded-lg text-sm transition-colors ${
                numericStr === preset.label
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "bg-bg-elevated border border-border hover:border-border-hover"
              }`}
            >
              <span className="font-mono font-semibold">{preset.label}</span>
              <span className="text-xs text-text-tertiary">{preset.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
