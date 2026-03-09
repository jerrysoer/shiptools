"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Loader2,
  Check,
  Trash2,
  HardDrive,
  Sparkles,
  AlertCircle,
  Plug,
  Server,
  ExternalLink,
} from "lucide-react";
import { useLocalAI } from "@/hooks/useLocalAI";
import { MODEL_PACKS, getModelPack } from "@/lib/ai/registry";
import type { ModelSlug } from "@/lib/ai/registry";
import type { OllamaModelInfo } from "@/lib/ai/ollama";
import EditorialRule from "@/components/EditorialRule";
import { trackEvent } from "@/lib/analytics";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const gb = bytes / 1e9;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1e6;
  return `${mb.toFixed(0)} MB`;
}

export default function ModelStorePage() {
  const {
    status,
    provider,
    model,
    selectedSlug,
    downloadedSlugs,
    storageUsed,
    storageAvailable,
    progress,
    progressText,
    isSupported,
    selectModel,
  } = useLocalAI();

  const [loadingSlug, setLoadingSlug] = useState<ModelSlug | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<ModelSlug | null>(null);
  const [ollamaModels, setOllamaModels] = useState<OllamaModelInfo[]>([]);
  const [ollamaChecked, setOllamaChecked] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "ai_models" });

    // Fetch Ollama models
    import("@/lib/ai/ollama").then(({ ollamaListModels }) => {
      ollamaListModels().then((models) => {
        setOllamaModels(models);
        setOllamaChecked(true);
      });
    });
  }, []);

  const isDownloading = status === "downloading" || status === "loading";

  async function handleSelect(slug: ModelSlug) {
    setLoadingSlug(slug);
    try {
      await selectModel(slug);
      trackEvent("ai_model_loaded", {
        provider: "webllm",
        model: getModelPack(slug)?.name ?? slug,
      });
    } catch {
      // Error handled by AIProvider
    } finally {
      setLoadingSlug(null);
    }
  }

  async function handleDelete(slug: ModelSlug) {
    const pack = getModelPack(slug);
    if (!pack) return;

    setDeletingSlug(slug);
    try {
      const { deleteSpecificModel } = await import("@/lib/ai/webllm");
      await deleteSpecificModel(pack.model);
      trackEvent("ai_model_deleted", { model: pack.name });
      // Force page refresh to update state
      window.location.reload();
    } catch {
      // Ignore
    } finally {
      setDeletingSlug(null);
    }
  }

  const storagePercent =
    storageAvailable > 0
      ? Math.round((storageUsed / storageAvailable) * 100)
      : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: "var(--color-dept-ai)" }}
          />
          <span className="font-mono text-xs tracking-widest uppercase text-text-tertiary">
            Department No. 01
          </span>
        </div>
        <EditorialRule className="mb-6" />
        <h1 className="font-heading font-bold text-4xl mb-3">Model Store</h1>
        <p className="text-text-secondary max-w-xl">
          Download and manage local AI models. All models run entirely in your
          browser using WebGPU — no data ever leaves your device.
        </p>
      </div>

      {/* WebGPU warning */}
      {!isSupported && (
        <div className="flex items-start gap-3 p-4 mb-8 bg-grade-f/5 border border-grade-f/20">
          <AlertCircle className="w-5 h-5 text-grade-f shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-grade-f mb-1">
              WebGPU not available
            </p>
            <p className="text-text-secondary">
              Your browser does not support WebGPU. Try the latest Chrome or
              Edge. Alternatively, install{" "}
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Ollama
              </a>{" "}
              for local AI via API.
            </p>
          </div>
        </div>
      )}

      {/* Storage meter */}
      {isSupported && (
        <div className="p-5 border border-border mb-8">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-4 h-4 text-text-tertiary" />
            <span className="text-sm font-medium">Browser Storage</span>
          </div>
          <div className="flex justify-between text-xs text-text-secondary mb-2">
            <span>{formatBytes(storageUsed)} used</span>
            <span>{formatBytes(storageAvailable)} available</span>
          </div>
          <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(storagePercent, 100)}%`,
                backgroundColor:
                  storagePercent > 80
                    ? "var(--color-grade-f)"
                    : "var(--color-dept-ai)",
              }}
            />
          </div>
        </div>
      )}

      {/* Ollama section */}
      {ollamaChecked && (
        <div className="mb-8">
          <h2 className="font-heading font-semibold text-lg flex items-center gap-2 mb-4">
            <Server className="w-4 h-4 text-text-tertiary" />
            Local Models (Ollama)
          </h2>

          {ollamaModels.length > 0 ? (
            <div className="space-y-3">
              {ollamaModels.map((m) => {
                const isActive =
                  provider === "ollama" && model?.id === m.name;

                return (
                  <div
                    key={m.name}
                    className={`p-4 border ${
                      isActive
                        ? "border-accent bg-accent/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Plug className="w-4 h-4 text-text-tertiary" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {m.name}
                            </span>
                            {isActive && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-grade-a/10 text-grade-a rounded">
                                <div className="w-1.5 h-1.5 rounded-full bg-grade-a animate-pulse" />
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-text-tertiary text-xs">
                            {m.sizeLabel} &middot;{" "}
                            {m.capabilities.length} capabilities
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2 ml-7">
                      {m.capabilities.slice(0, 8).map((cap) => (
                        <span
                          key={cap}
                          className="px-2 py-0.5 text-[10px] bg-bg-elevated border border-border rounded-full text-text-tertiary"
                        >
                          {cap.replace(/_/g, " ")}
                        </span>
                      ))}
                      {m.capabilities.length > 8 && (
                        <span className="px-2 py-0.5 text-[10px] text-text-tertiary">
                          +{m.capabilities.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-5 border border-dashed border-border text-center">
              <Server className="w-6 h-6 text-text-tertiary mx-auto mb-2" />
              <p className="text-sm text-text-secondary mb-2">
                Ollama not detected
              </p>
              <p className="text-xs text-text-tertiary mb-3">
                Install Ollama for larger, more powerful local models.
              </p>
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-accent hover:underline"
              >
                Install Ollama
                <ExternalLink className="w-3 h-3" />
              </a>
              <p className="text-text-tertiary text-[10px] mt-2">
                If Ollama is running, set{" "}
                <code className="px-1 py-0.5 bg-bg-surface rounded">
                  OLLAMA_ORIGINS=*
                </code>{" "}
                to fix CORS.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Model packs */}
      {isSupported && (
        <div className="space-y-4">
          <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            WebLLM Model Packs
          </h2>

          {MODEL_PACKS.map((pack) => {
            const isActive = selectedSlug === pack.slug && provider === "webllm";
            const isDownloaded = downloadedSlugs.includes(pack.slug);
            const isLoading = loadingSlug === pack.slug && isDownloading;
            const isDeleting = deletingSlug === pack.slug;

            return (
              <div
                key={pack.slug}
                className={`p-5 border transition-colors ${
                  isActive
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/30"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">{pack.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{pack.name}</span>
                        {pack.recommended && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded">
                            Recommended
                          </span>
                        )}
                        {isActive && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-grade-a/10 text-grade-a rounded">
                            <div className="w-1.5 h-1.5 rounded-full bg-grade-a animate-pulse" />
                            Active
                          </span>
                        )}
                        {isDownloaded && !isActive && (
                          <span className="flex items-center gap-1 text-xs text-text-tertiary">
                            <Check className="w-3 h-3" />
                            Cached
                          </span>
                        )}
                      </div>
                      <p className="text-text-tertiary text-xs mt-1">
                        {pack.sizeLabel} download &middot; {pack.vramLabel}{" "}
                        VRAM
                      </p>

                      {/* Capability badges */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {pack.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="px-2 py-0.5 text-[10px] bg-bg-elevated border border-border rounded-full text-text-tertiary"
                          >
                            {cap.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    {isDownloaded && !isActive && (
                      <button
                        onClick={() => handleDelete(pack.slug)}
                        disabled={isDeleting || isDownloading}
                        className="p-2 text-text-tertiary hover:text-grade-f border border-border transition-colors disabled:opacity-50"
                        title="Delete cached model"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {!isActive && (
                      <button
                        onClick={() => handleSelect(pack.slug)}
                        disabled={isDownloading}
                        className="flex items-center gap-2 px-4 py-2 bg-text-primary text-bg-primary text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isDownloaded ? (
                          <Sparkles className="w-4 h-4" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        {isLoading
                          ? "Loading..."
                          : isDownloaded
                            ? "Switch"
                            : "Download"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Download progress */}
                {isLoading && (
                  <div className="mt-4">
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
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <p className="text-text-tertiary text-xs mt-10">
        Models are powered by WebLLM and run entirely in your browser using
        WebGPU. Downloaded models are cached in IndexedDB for offline use. No
        data is sent to any server.
      </p>
    </div>
  );
}
