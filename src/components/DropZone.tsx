"use client";

import { useState, useCallback, useRef, useId } from "react";
import { Upload } from "lucide-react";

interface DropZoneProps {
  accept: string;
  maxSize: number;
  onFiles: (files: File[]) => void;
  label?: string;
  multiple?: boolean;
}

export default function DropZone({
  accept,
  maxSize,
  onFiles,
  label = "Drop files here or click to browse",
  multiple = true,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  const validateFiles = useCallback(
    (files: FileList | File[]): File[] => {
      const accepted = accept
        .split(",")
        .map((a) => a.trim().toLowerCase());
      const acceptAll = accepted.includes("*/*") || accepted.includes("*");
      const valid: File[] = [];

      for (const file of Array.from(files)) {
        const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
        const mime = file.type.toLowerCase();

        const matchesAccept = acceptAll || accepted.some(
          (a) => a === ext || a === mime || (a.endsWith("/*") && mime.startsWith(a.replace("/*", "/")))
        );

        if (!matchesAccept) {
          setError(`Unsupported file type: ${file.name}`);
          continue;
        }

        if (file.size > maxSize) {
          const maxMB = Math.round(maxSize / 1024 / 1024);
          setError(`File too large: ${file.name} (max ${maxMB}MB)`);
          continue;
        }

        valid.push(file);
      }

      return valid;
    },
    [accept, maxSize]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setError(null);

      const files = validateFiles(e.dataTransfer.files);
      if (files.length > 0) onFiles(files);
    },
    [validateFiles, onFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      if (!e.target.files) return;
      const files = validateFiles(e.target.files);
      if (files.length > 0) onFiles(files);
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [validateFiles, onFiles]
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-describedby={error ? errorId : undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-accent bg-accent/5"
            : "border-border hover:border-border-hover hover:bg-bg-surface/50"
        }`}
      >
        <Upload
          className={`w-8 h-8 mx-auto mb-3 ${
            isDragging ? "text-accent" : "text-text-tertiary"
          }`}
        />
        <p className="text-text-secondary text-sm">{label}</p>
        <p className="text-text-tertiary text-xs mt-1">
          Max {Math.round(maxSize / 1024 / 1024)}MB per file
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
        />
      </div>
      {error && (
        <p id={errorId} className="text-grade-f text-xs mt-2" role="alert">{error}</p>
      )}
    </div>
  );
}
