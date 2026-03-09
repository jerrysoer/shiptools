"use client";

import { useState, useCallback, useEffect } from "react";
import {
  FileArchive,
  FolderOpen,
  Download,
  Trash2,
  Loader2,
  File,
  Folder,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import DropZone from "@/components/DropZone";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { MAX_ZIP_SIZE } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";

type Mode = "create" | "extract";

interface ExtractedEntry {
  path: string;
  name: string;
  dir: boolean;
  size: number;
  getData: () => Promise<Blob>;
}

interface TreeNode {
  name: string;
  path: string;
  dir: boolean;
  size: number;
  children: TreeNode[];
  getData?: () => Promise<Blob>;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

function buildTree(entries: ExtractedEntry[]): TreeNode[] {
  const root: TreeNode[] = [];
  const map = new Map<string, TreeNode>();

  // Sort so directories come first, then alphabetically
  const sorted = [...entries].sort((a, b) => {
    if (a.dir !== b.dir) return a.dir ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const entry of sorted) {
    const parts = entry.path.split("/").filter(Boolean);
    let currentLevel = root;
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      currentPath += (currentPath ? "/" : "") + parts[i];
      const isLast = i === parts.length - 1;

      let existing = map.get(currentPath);
      if (!existing) {
        existing = {
          name: parts[i],
          path: currentPath,
          dir: isLast ? entry.dir : true,
          size: isLast ? entry.size : 0,
          children: [],
          getData: isLast && !entry.dir ? entry.getData : undefined,
        };
        map.set(currentPath, existing);
        currentLevel.push(existing);
      }
      currentLevel = existing.children;
    }
  }

  return root;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function FileTreeNode({
  node,
  depth,
}: {
  node: TreeNode;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!node.getData) return;
    setDownloading(true);
    try {
      const blob = await node.getData();
      downloadBlob(blob, node.name);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-bg-elevated/50 group"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {node.dir ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-text-secondary hover:text-text-primary"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            <Folder className="w-4 h-4 text-accent" />
          </button>
        ) : (
          <span className="flex items-center gap-1 ml-[18px]">
            <File className="w-4 h-4 text-text-tertiary" />
          </span>
        )}

        <span className="font-mono text-sm truncate flex-1">{node.name}</span>

        {!node.dir && (
          <>
            <span className="text-text-tertiary text-xs whitespace-nowrap">
              {formatSize(node.size)}
            </span>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-bg-surface transition-opacity"
              title="Download file"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 text-text-tertiary animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-text-tertiary" />
              )}
            </button>
          </>
        )}
      </div>

      {node.dir && expanded && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create Mode ────────────────────────────────────────────

function CreateMode() {
  const [files, setFiles] = useState<File[]>([]);
  const [zipName, setZipName] = useState("archive");
  const [creating, setCreating] = useState(false);

  const handleFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      const unique = newFiles.filter((f) => !names.has(f.name));
      return [...prev, ...unique];
    });
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const createZip = async () => {
    if (files.length === 0) return;
    setCreating(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (const file of files) {
        const data = await file.arrayBuffer();
        zip.file(file.name, data);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const filename = (zipName.trim() || "archive") + ".zip";
      downloadBlob(blob, filename);
      trackEvent("tool_used", { tool: "zip" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <DropZone
        accept="*/*"
        maxSize={MAX_ZIP_SIZE}
        onFiles={handleFiles}
        label="Drop files here to add to ZIP"
        multiple
      />

      {files.length > 0 && (
        <div className="bg-bg-surface border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">
              {files.length} file{files.length !== 1 ? "s" : ""} &middot;{" "}
              {formatSize(totalSize)}
            </span>
            <button
              onClick={() => setFiles([])}
              className="text-text-tertiary hover:text-grade-f text-xs flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear all
            </button>
          </div>

          <div className="divide-y divide-border">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center gap-3 py-2"
              >
                <File className="w-4 h-4 text-text-tertiary shrink-0" />
                <span className="font-mono text-sm truncate flex-1">
                  {file.name}
                </span>
                <span className="text-text-tertiary text-xs whitespace-nowrap">
                  {formatSize(file.size)}
                </span>
                <button
                  onClick={() => removeFile(i)}
                  className="p-1 rounded hover:bg-bg-elevated text-text-tertiary hover:text-grade-f"
                  title="Remove file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={zipName}
                onChange={(e) => setZipName(e.target.value)}
                placeholder="archive"
                className="bg-bg-elevated border border-border px-3 py-2 text-sm font-mono flex-1 focus:outline-none focus:border-accent"
              />
              <span className="text-text-tertiary text-sm">.zip</span>
            </div>
            <button
              onClick={createZip}
              disabled={creating || files.length === 0}
              className="bg-accent text-accent-fg px-4 py-2 hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download ZIP
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Extract Mode ───────────────────────────────────────────

function ExtractMode() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [entries, setEntries] = useState<ExtractedEntry[]>([]);
  const [zipFileName, setZipFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractingAll, setExtractingAll] = useState(false);

  const fileCount = entries.filter((e) => !e.dir).length;
  const totalSize = entries.reduce((sum, e) => sum + e.size, 0);

  const handleZip = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setTree([]);
    setEntries([]);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(await file.arrayBuffer());

      const extracted: ExtractedEntry[] = [];

      zip.forEach((relativePath, zipEntry) => {
        extracted.push({
          path: relativePath,
          name: zipEntry.name.split("/").filter(Boolean).pop() ?? relativePath,
          dir: zipEntry.dir,
          size: (zipEntry as unknown as { _data?: { uncompressedSize: number } })._data?.uncompressedSize ?? 0,
          getData: async () => {
            const data = await zipEntry.async("blob");
            return data;
          },
        });
      });

      setEntries(extracted);
      setTree(buildTree(extracted));
      setZipFileName(file.name);
      trackEvent("tool_used", { tool: "zip" });
    } catch {
      setError("Failed to read ZIP file. It may be corrupted or password-protected.");
    } finally {
      setLoading(false);
    }
  }, []);

  const extractAll = async () => {
    const fileEntries = entries.filter((e) => !e.dir);
    if (fileEntries.length === 0) return;

    setExtractingAll(true);
    try {
      // If only one file, download directly
      if (fileEntries.length === 1) {
        const blob = await fileEntries[0].getData();
        downloadBlob(blob, fileEntries[0].name);
        return;
      }

      // Multiple files: re-create as ZIP with original structure
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (const entry of fileEntries) {
        const blob = await entry.getData();
        zip.file(entry.path, blob);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const name = zipFileName.replace(/\.zip$/i, "") + "-extracted.zip";
      downloadBlob(blob, name);
    } finally {
      setExtractingAll(false);
    }
  };

  return (
    <div className="space-y-4">
      <DropZone
        accept="application/zip,.zip,application/x-zip-compressed"
        maxSize={MAX_ZIP_SIZE}
        onFiles={handleZip}
        label="Drop a ZIP file here to extract"
        multiple={false}
      />

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Reading archive...</span>
        </div>
      )}

      {error && (
        <div className="bg-grade-f/10 border border-grade-f/20 p-4 text-grade-f text-sm">
          {error}
        </div>
      )}

      {tree.length > 0 && (
        <div className="bg-bg-surface border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-text-secondary text-sm">
              <span className="font-mono text-text-primary">{zipFileName}</span>
              {" "}&middot; {fileCount} file{fileCount !== 1 ? "s" : ""} &middot;{" "}
              {formatSize(totalSize)}
            </div>
            <button
              onClick={extractAll}
              disabled={extractingAll}
              className="bg-accent text-accent-fg px-4 py-2 hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
            >
              {extractingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download All
                </>
              )}
            </button>
          </div>

          <div className="border border-border overflow-hidden bg-bg-primary/50">
            <div className="max-h-96 overflow-y-auto py-1">
              {tree.map((node) => (
                <FileTreeNode key={node.path} node={node} depth={0} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

export default function ZipTool() {
  useEffect(() => { trackEvent("tool_opened", { tool: "zip" }); }, []);

  const [mode, setMode] = useState<Mode>("create");

  return (
    <div>
      <ToolPageHeader
        icon={FileArchive}
        title="ZIP / Unzip"
        description="Create and extract ZIP archives. Browse file trees and download individual files — all in your browser."
      />
      <div className="space-y-6">
      <div className="flex items-center justify-center">
        <div className="flex bg-bg-surface border border-border p-1">
          <button
            onClick={() => setMode("create")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "create"
                ? "bg-accent text-accent-fg"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <FileArchive className="w-4 h-4" />
            Create ZIP
          </button>
          <button
            onClick={() => setMode("extract")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "extract"
                ? "bg-accent text-accent-fg"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Extract ZIP
          </button>
        </div>
      </div>

      {mode === "create" ? <CreateMode /> : <ExtractMode />}
      </div>
    </div>
  );
}
