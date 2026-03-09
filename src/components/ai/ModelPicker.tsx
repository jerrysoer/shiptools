"use client";

import { useState } from "react";
import { X, Download, Loader2, Check } from "lucide-react";
import { useLocalAI } from "@/hooks/useLocalAI";
import { MODEL_PACKS } from "@/lib/ai/registry";
import type { ModelSlug } from "@/lib/ai/registry";

interface ModelPickerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * First-time modal shown when user clicks any AIChip without a model selected.
 * Presents 5 model packs and downloads the chosen one.
 */
export default function ModelPicker({ open, onClose }: ModelPickerProps) {
  const { selectModel, status, progress, progressText, downloadedSlugs } =
    useLocalAI();
  const [selectedPack, setSelectedPack] = useState<ModelSlug | null>(null);
  const isDownloading =
    status === "downloading" || status === "loading";

  if (!open) return null;

  async function handleSelect(slug: ModelSlug) {
    setSelectedPack(slug);
    try {
      await selectModel(slug);
      onClose();
    } catch {
      // Error handled by AIProvider
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-primary border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-heading font-bold text-lg">
              Choose an AI Model
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              Models run locally in your browser via WebGPU
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isDownloading}
            className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Model list */}
        <div className="p-5 space-y-3">
          {MODEL_PACKS.map((pack) => {
            const isSelected = selectedPack === pack.slug;
            const isDownloaded = downloadedSlugs.includes(pack.slug);
            const isActive = isSelected && isDownloading;

            return (
              <button
                key={pack.slug}
                onClick={() => handleSelect(pack.slug)}
                disabled={isDownloading}
                className={`w-full text-left p-4 border transition-colors ${
                  isActive
                    ? "border-accent bg-accent/5"
                    : pack.recommended
                      ? "border-accent/40 hover:border-accent hover:bg-accent/5"
                      : "border-border hover:border-accent/40 hover:bg-bg-elevated"
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{pack.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {pack.name}
                        </span>
                        {pack.recommended && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded">
                            Recommended
                          </span>
                        )}
                        {isDownloaded && !isActive && (
                          <Check className="w-3.5 h-3.5 text-grade-a" />
                        )}
                      </div>
                      <p className="text-text-tertiary text-xs mt-0.5">
                        {pack.sizeLabel} &middot; {pack.vramLabel} VRAM
                        &middot; {pack.capabilities.length} features
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-3">
                    {isActive ? (
                      <Loader2 className="w-4 h-4 text-accent animate-spin" />
                    ) : isDownloaded ? (
                      <span className="text-xs text-text-tertiary">
                        Cached
                      </span>
                    ) : (
                      <Download className="w-4 h-4 text-text-tertiary" />
                    )}
                  </div>
                </div>

                {/* Download progress */}
                {isActive && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-text-secondary mb-1">
                      <span>{progressText}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1 bg-bg-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: "var(--color-dept-ai)",
                        }}
                      />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <p className="text-text-tertiary text-xs">
            Models are cached in your browser. You can switch or delete them
            from{" "}
            <span className="text-accent">/ai/models</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
