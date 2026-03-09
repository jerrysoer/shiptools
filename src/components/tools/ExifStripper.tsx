"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Download,
  DownloadCloud,
  Trash2,
  Loader2,
  CircleCheck,
  MapPin,
  Camera,
  Calendar,
  Eye,
  EyeOff,
  ImageOff,
} from "lucide-react";
import DropZone from "@/components/DropZone";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";
import { MAX_IMAGE_SIZE } from "@/lib/constants";

const ACCEPT = "image/jpeg,image/png,image/webp,image/tiff";

interface ExifTag {
  label: string;
  value: string;
  sensitive: boolean;
}

interface ImageEntry {
  id: string;
  file: File;
  preview: string;
  status: "reading" | "ready" | "stripping" | "done" | "error";
  tags: ExifTag[];
  hasGps: boolean;
  strippedBlob: Blob | null;
  strippedSize: number;
  error: string | null;
  tagsVisible: boolean;
}

function formatExifValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === "number") {
    if (key.toLowerCase().includes("focal")) return `${value}mm`;
    if (key === "FNumber" || key === "ApertureValue") return `f/${value}`;
    if (key === "ExposureTime") {
      return value < 1 ? `1/${Math.round(1 / value)}s` : `${value}s`;
    }
    if (key === "ISO" || key === "ISOSpeedRatings") return `ISO ${value}`;
    return String(value);
  }
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function formatGps(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(6)}${latDir}, ${Math.abs(lng).toFixed(6)}${lngDir}`;
}

const TAG_LABELS: Record<string, string> = {
  Make: "Camera Make",
  Model: "Camera Model",
  Software: "Software",
  DateTimeOriginal: "Date Taken",
  CreateDate: "Date Created",
  ModifyDate: "Date Modified",
  ExposureTime: "Exposure",
  FNumber: "Aperture",
  ISO: "ISO",
  ISOSpeedRatings: "ISO",
  FocalLength: "Focal Length",
  FocalLengthIn35mmFormat: "Focal Length (35mm equiv.)",
  LensModel: "Lens",
  LensMake: "Lens Make",
  Flash: "Flash",
  WhiteBalance: "White Balance",
  MeteringMode: "Metering Mode",
  ExposureMode: "Exposure Mode",
  ExposureProgram: "Exposure Program",
  ImageWidth: "Width",
  ImageHeight: "Height",
  Orientation: "Orientation",
  ColorSpace: "Color Space",
  Artist: "Artist",
  Copyright: "Copyright",
  ImageDescription: "Description",
};

const SENSITIVE_KEYS = new Set([
  "latitude",
  "longitude",
  "GPSLatitude",
  "GPSLongitude",
  "GPSAltitude",
  "GPSDateStamp",
  "GPSTimeStamp",
  "Artist",
  "Copyright",
  "ImageDescription",
  "Software",
]);

async function readExifTags(file: File): Promise<{ tags: ExifTag[]; hasGps: boolean }> {
  const exifr = (await import("exifr")).default;
  const tags: ExifTag[] = [];
  let hasGps = false;

  try {
    const data = await exifr.parse(file);
    if (!data) return { tags: [], hasGps: false };

    // Check GPS
    if (data.latitude != null && data.longitude != null) {
      hasGps = true;
      tags.push({
        label: "GPS Location",
        value: formatGps(data.latitude, data.longitude),
        sensitive: true,
      });
    }
    if (data.GPSAltitude != null) {
      tags.push({
        label: "GPS Altitude",
        value: `${data.GPSAltitude.toFixed(1)}m`,
        sensitive: true,
      });
    }

    // Extract known tags
    for (const [key, label] of Object.entries(TAG_LABELS)) {
      if (data[key] != null) {
        const formatted = formatExifValue(key, data[key]);
        if (formatted) {
          tags.push({
            label,
            value: formatted,
            sensitive: SENSITIVE_KEYS.has(key),
          });
        }
      }
    }

    // Deduplicate by label (first occurrence wins)
    const seen = new Set<string>();
    const deduped: ExifTag[] = [];
    for (const tag of tags) {
      if (!seen.has(tag.label)) {
        seen.add(tag.label);
        deduped.push(tag);
      }
    }

    return { tags: deduped, hasGps };
  } catch {
    return { tags: [], hasGps: false };
  }
}

function stripMetadata(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      ctx.drawImage(img, 0, 0);

      // Determine output MIME — keep original format where possible
      let mime = file.type;
      let quality: number | undefined;
      if (mime === "image/jpeg") {
        quality = 0.95;
      } else if (mime === "image/webp") {
        quality = 0.95;
      } else if (mime === "image/tiff") {
        // TIFF not supported as canvas output — use PNG
        mime = "image/png";
      }

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to encode clean image"));
        },
        mime,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

let entryIdCounter = 0;

export default function ExifStripper() {
  useEffect(() => { trackEvent("tool_opened", { tool: "exif" }); }, []);

  const [entries, setEntries] = useState<ImageEntry[]>([]);
  const [strippingAll, setStrippingAll] = useState(false);

  const updateEntry = useCallback((id: string, patch: Partial<ImageEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const newEntries: ImageEntry[] = files.map((file) => ({
        id: `exif-${++entryIdCounter}`,
        file,
        preview: URL.createObjectURL(file),
        status: "reading" as const,
        tags: [],
        hasGps: false,
        strippedBlob: null,
        strippedSize: 0,
        error: null,
        tagsVisible: true,
      }));

      setEntries((prev) => [...prev, ...newEntries]);

      // Read EXIF for each in parallel
      await Promise.all(
        newEntries.map(async (entry) => {
          try {
            const { tags, hasGps } = await readExifTags(entry.file);
            updateEntry(entry.id, { status: "ready", tags, hasGps });
          } catch {
            updateEntry(entry.id, { status: "ready", tags: [], hasGps: false });
          }
        })
      );
    },
    [updateEntry]
  );

  const stripSingle = useCallback(
    async (id: string) => {
      const entry = entries.find((e) => e.id === id);
      if (!entry || entry.status === "stripping" || entry.status === "done") return;

      updateEntry(id, { status: "stripping" });
      try {
        const blob = await stripMetadata(entry.file);
        updateEntry(id, { status: "done", strippedBlob: blob, strippedSize: blob.size });
        trackEvent("tool_used", { tool: "exif" });
      } catch (err) {
        updateEntry(id, {
          status: "error",
          error: err instanceof Error ? err.message : "Strip failed",
        });
      }
    },
    [entries, updateEntry]
  );

  const stripAll = useCallback(async () => {
    const toStrip = entries.filter((e) => e.status === "ready");
    if (toStrip.length === 0) return;
    setStrippingAll(true);

    for (const entry of toStrip) {
      updateEntry(entry.id, { status: "stripping" });
      try {
        const blob = await stripMetadata(entry.file);
        updateEntry(entry.id, { status: "done", strippedBlob: blob, strippedSize: blob.size });
      } catch (err) {
        updateEntry(entry.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Strip failed",
        });
      }
    }
    setStrippingAll(false);
  }, [entries, updateEntry]);

  const downloadSingle = useCallback((entry: ImageEntry) => {
    if (!entry.strippedBlob) return;
    const ext = entry.file.name.split(".").pop() || "jpg";
    const baseName = entry.file.name.replace(/\.[^.]+$/, "");
    const url = URL.createObjectURL(entry.strippedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}_clean.${ext === "tiff" || ext === "tif" ? "png" : ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadAllZip = useCallback(async () => {
    const doneEntries = entries.filter((e) => e.status === "done" && e.strippedBlob);
    if (doneEntries.length === 0) return;

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const entry of doneEntries) {
      const ext = entry.file.name.split(".").pop() || "jpg";
      const baseName = entry.file.name.replace(/\.[^.]+$/, "");
      const outExt = ext === "tiff" || ext === "tif" ? "png" : ext;
      zip.file(`${baseName}_clean.${outExt}`, entry.strippedBlob!);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stripped_images.zip";
    a.click();
    URL.revokeObjectURL(url);
  }, [entries]);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) URL.revokeObjectURL(entry.preview);
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    entries.forEach((e) => URL.revokeObjectURL(e.preview));
    setEntries([]);
  }, [entries]);

  const toggleTags = useCallback(
    (id: string) => {
      const entry = entries.find((e) => e.id === id);
      if (entry) updateEntry(id, { tagsVisible: !entry.tagsVisible });
    },
    [entries, updateEntry]
  );

  const readyCount = entries.filter((e) => e.status === "ready").length;
  const doneCount = entries.filter((e) => e.status === "done").length;
  const totalWithGps = entries.filter((e) => e.hasGps).length;

  return (
    <div>
      <ToolPageHeader
        icon={Eye}
        title="EXIF / Metadata Stripper"
        description="View embedded metadata in your images and strip it clean. Remove GPS coordinates, camera info, timestamps, and software tags."
      />
      <div className="space-y-6">
      {entries.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={clearAll}
            className="text-text-tertiary hover:text-text-primary text-xs transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      <DropZone
        accept={ACCEPT}
        maxSize={MAX_IMAGE_SIZE}
        onFiles={handleFiles}
        label="Drop images here to inspect & strip metadata"
      />

      {/* Summary banner when GPS found */}
      {totalWithGps > 0 && (
        <div className="flex items-center gap-2 bg-grade-f/10 border border-grade-f/25 px-4 py-3">
          <MapPin className="w-4 h-4 text-grade-f shrink-0" />
          <p className="text-sm text-grade-f">
            <span className="font-medium">{totalWithGps}</span>{" "}
            {totalWithGps === 1 ? "image contains" : "images contain"} GPS location
            data
          </p>
        </div>
      )}

      {/* Batch strip button */}
      {readyCount > 0 && (
        <button
          onClick={stripAll}
          disabled={strippingAll}
          className="w-full py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-60 text-accent-fg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {strippingAll ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Stripping...
            </>
          ) : (
            <>
              <ImageOff className="w-4 h-4" />
              Strip metadata from {readyCount} image{readyCount !== 1 ? "s" : ""}
            </>
          )}
        </button>
      )}

      {/* Batch done banner */}
      {doneCount > 1 &&
        entries.every((e) => e.status === "done" || e.status === "error") && (
          <div className="flex items-center justify-between bg-grade-a/10 border border-grade-a/25 px-4 py-3">
            <div className="flex items-center gap-2">
              <CircleCheck className="w-4 h-4 text-grade-a" />
              <span className="text-sm text-grade-a font-medium">
                {doneCount} image{doneCount !== 1 ? "s" : ""} stripped clean
              </span>
            </div>
            <button
              onClick={downloadAllZip}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-grade-a/15 hover:bg-grade-a/25 text-grade-a text-xs font-medium transition-colors"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              Download All (.zip)
            </button>
          </div>
        )}

      {/* Image entries */}
      {entries.length > 0 && (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`border overflow-hidden transition-colors ${
                entry.status === "done"
                  ? "border-grade-a/25 bg-grade-a/5"
                  : entry.status === "error"
                    ? "border-grade-f/25 bg-grade-f/5"
                    : "border-border bg-bg-surface"
              }`}
            >
              {/* Header row */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Thumbnail */}
                <img
                  src={entry.preview}
                  alt={entry.file.name}
                  className="w-10 h-10 rounded object-cover shrink-0"
                />

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate font-medium">
                    {entry.file.name}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    {(entry.file.size / 1024).toFixed(0)} KB
                    {entry.tags.length > 0 && ` · ${entry.tags.length} tags found`}
                    {entry.tags.length === 0 &&
                      entry.status !== "reading" &&
                      " · No metadata found"}
                    {entry.hasGps && (
                      <span className="text-grade-f font-medium"> · GPS detected</span>
                    )}
                    {entry.status === "done" && (
                      <span className="text-grade-a">
                        {" "}
                        · Clean ({(entry.strippedSize / 1024).toFixed(0)} KB)
                      </span>
                    )}
                    {entry.status === "error" && (
                      <span className="text-grade-f"> · {entry.error}</span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {entry.status === "reading" && (
                    <Loader2 className="w-4 h-4 text-accent animate-spin" />
                  )}
                  {entry.status === "stripping" && (
                    <Loader2 className="w-4 h-4 text-accent animate-spin" />
                  )}
                  {entry.status === "ready" && entry.tags.length > 0 && (
                    <button
                      onClick={() => toggleTags(entry.id)}
                      className="p-1.5 rounded hover:bg-bg-elevated transition-colors text-text-tertiary"
                      title={entry.tagsVisible ? "Hide tags" : "Show tags"}
                    >
                      {entry.tagsVisible ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  {entry.status === "ready" && (
                    <button
                      onClick={() => stripSingle(entry.id)}
                      className="px-3 py-1 bg-accent text-accent-fg text-xs font-medium hover:bg-accent/90 transition-colors"
                    >
                      Strip
                    </button>
                  )}
                  {entry.status === "done" && (
                    <>
                      <CircleCheck className="w-4 h-4 text-grade-a shrink-0" />
                      <button
                        onClick={() => downloadSingle(entry)}
                        className="p-1.5 rounded hover:bg-bg-elevated transition-colors text-grade-a"
                        title="Download clean image"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="p-1.5 rounded hover:bg-bg-elevated transition-colors text-text-tertiary"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* EXIF tag table with reveal animation */}
              {entry.tags.length > 0 && entry.tagsVisible && (
                <div className="border-t border-border/50 px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
                    {entry.tags.map((tag, i) => (
                      <div key={i} className="contents">
                        <span
                          className={`font-medium ${
                            tag.sensitive ? "text-grade-f" : "text-text-secondary"
                          }`}
                        >
                          {tag.sensitive && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-grade-f mr-1.5 align-middle" />
                          )}
                          {tag.label}
                        </span>
                        <span
                          className={`font-mono ${
                            tag.sensitive ? "text-grade-f/80" : "text-text-tertiary"
                          }`}
                        >
                          {tag.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  {entry.hasGps && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-grade-f/70">
                      <MapPin className="w-3 h-3" />
                      <span>
                        Sensitive location data will be removed when stripped
                      </span>
                    </div>
                  )}
                  {entry.tags.some(
                    (t) =>
                      t.label === "Camera Make" || t.label === "Camera Model"
                  ) && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-text-tertiary">
                      <Camera className="w-3 h-3" />
                      <span>Camera identification data present</span>
                    </div>
                  )}
                  {entry.tags.some(
                    (t) =>
                      t.label === "Date Taken" ||
                      t.label === "Date Created"
                  ) && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-text-tertiary">
                      <Calendar className="w-3 h-3" />
                      <span>Timestamp data present</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
