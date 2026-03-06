"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Code, Copy, Check } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

/** Attrs that need exact JSX mappings (not simple hyphen→camelCase). */
const SPECIAL: Record<string, string> = {
  class: "className", for: "htmlFor", tabindex: "tabIndex",
  "xlink:href": "xlinkHref", "xml:space": "xmlSpace", "xmlns:xlink": "xmlnsXlink",
};

/** Convert a hyphenated attr name to camelCase: stroke-width → strokeWidth */
function toCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function convertAttributes(svg: string): string {
  let result = svg;
  for (const [attr, jsx] of Object.entries(SPECIAL)) {
    const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`(\\s)${escaped}=`, "g"), `$1${jsx}=`);
  }
  // Generic: any remaining hyphenated attribute → camelCase
  result = result.replace(/(\s)([a-z]+-[a-z][-a-z]*)=/g, (_, ws: string, attr: string) => {
    return `${ws}${toCamel(attr)}=`;
  });
  return result;
}

function generateComponent(svg: string, name: string, ts: boolean, memo: boolean): string {
  if (!svg.trim()) return "";
  let jsx = convertAttributes(svg.trim());
  // Add {...props} spread to root <svg>
  jsx = jsx.replace(/<svg(\s)/, "<svg {...props}$1");
  const indented = jsx.split("\n").map((l) => `    ${l}`).join("\n");
  const propsType = ts ? ": React.SVGProps<SVGSVGElement>" : "";
  const imp = memo ? `import React, { memo } from "react";` : `import React from "react";`;
  const fn = `function ${name}(props${propsType}) {\n  return (\n${indented}\n  );\n}`;
  const exp = memo ? `export default memo(${name});` : `export default ${name};`;
  return `${imp}\n\n${fn}\n\n${exp}\n`;
}

export default function SvgToReact() {
  useEffect(() => { trackEvent("tool_opened", { tool: "svg-to-react" }); }, []);

  const [svgInput, setSvgInput] = useState("");
  const [componentName, setComponentName] = useState("SvgIcon");
  const [useTs, setUseTs] = useState(true);
  const [wrapMemo, setWrapMemo] = useState(false);
  const [copied, setCopied] = useState(false);

  const output = useMemo(
    () => generateComponent(svgInput, componentName || "SvgIcon", useTs, wrapMemo),
    [svgInput, componentName, useTs, wrapMemo]
  );

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = output;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    trackEvent("tool_used", { tool: "svg-to-react" });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  return (
    <div>
      <ToolPageHeader
        icon={Code}
        title="SVG to React Component"
        description="Convert raw SVG markup into a ready-to-use React component with camelCase attributes and props spreading."
      />
      <div className="space-y-5">
        {/* Options row */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="component-name" className="block text-sm font-medium mb-1.5">
              Component name
            </label>
            <input
              id="component-name"
              type="text"
              value={componentName}
              onChange={(e) => setComponentName(e.target.value.replace(/[^a-zA-Z0-9_$]/g, ""))}
              placeholder="SvgIcon"
              className="bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent transition-colors w-44"
            />
          </div>
          <div className="flex gap-1 p-1 bg-bg-surface border border-border rounded-lg">
            <button
              onClick={() => setUseTs((v) => !v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                useTs ? "bg-accent text-accent-fg" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              TypeScript
            </button>
            <button
              onClick={() => setWrapMemo((v) => !v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                wrapMemo ? "bg-accent text-accent-fg" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              memo
            </button>
          </div>
        </div>

        {/* SVG Input */}
        <div>
          <label htmlFor="svg-input" className="block text-sm font-medium mb-1.5">
            SVG markup
          </label>
          <textarea
            id="svg-input"
            value={svgInput}
            onChange={(e) => setSvgInput(e.target.value)}
            placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>'
            rows={8}
            className="w-full bg-bg-surface border border-border rounded-xl px-4 py-3 text-sm font-mono placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors resize-y"
          />
        </div>

        {/* Preview */}
        {svgInput.trim() && (
          <div className="bg-bg-surface border border-border rounded-xl p-4">
            <h3 className="font-heading font-semibold text-sm mb-2">Preview</h3>
            <iframe
              sandbox=""
              srcDoc={`<!DOCTYPE html><html><head><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100%;background:transparent}svg{max-width:100%;max-height:128px}</style></head><body>${svgInput}</body></html>`}
              className="w-full h-40 bg-bg-elevated border border-border rounded-lg"
              title="SVG Preview"
            />
          </div>
        )}

        {/* Output */}
        {output && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium">
                Component
                <span className="text-text-tertiary font-normal ml-2">
                  ({useTs ? ".tsx" : ".jsx"})
                </span>
              </label>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-grade-a" />
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
            <textarea
              readOnly
              value={output}
              rows={12}
              className="w-full bg-bg-surface border border-border rounded-xl px-4 py-3 text-sm font-mono text-text-secondary focus:outline-none resize-y"
            />
          </div>
        )}
      </div>
    </div>
  );
}
