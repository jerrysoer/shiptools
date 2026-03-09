"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, ImageIcon } from "lucide-react";
import { useDesign } from "../DesignProvider";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"];

export default function ImagePanel() {
  const { addImage } = useDesign();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (ACCEPTED_TYPES.includes(file.type)) {
          addImage(file);
        }
      }
    },
    [addImage],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text-primary">Images</h3>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
          isDragOver
            ? "border-text-primary bg-bg-secondary"
            : "border-border-primary hover:border-text-secondary"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-text-tertiary" />
        <p className="text-xs text-text-secondary">
          Drop images here or click to browse
        </p>
        <p className="text-[10px] text-text-tertiary mt-1">
          PNG, JPG, WebP, SVG, GIF
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {/* Info */}
      <div className="flex items-start gap-2 p-3 rounded-md bg-bg-secondary text-xs text-text-secondary">
        <ImageIcon className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          Images are added directly to the canvas. Drag to position, resize
          handles to scale. Right-click for background removal.
        </p>
      </div>
    </div>
  );
}
