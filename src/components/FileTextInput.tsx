"use client";

import { useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { useFileToText, FILE_TEXT_ACCEPT } from "@/hooks/useFileToText";

interface FileTextInputProps {
  onTextExtracted: (text: string) => void;
}

export default function FileTextInput({ onTextExtracted }: FileTextInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isExtracting, error, extractFromFile } = useFileToText();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await extractFromFile(file);
      onTextExtracted(text);
    } catch {
      // error is already set in the hook
    }

    // Reset so the same file can be re-uploaded
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={FILE_TEXT_ACCEPT}
        onChange={handleChange}
        className="hidden"
        aria-label="Upload file for text extraction"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isExtracting}
        className="flex items-center gap-2 px-3 py-1.5 bg-bg-elevated hover:bg-bg-hover text-text-secondary border border-border text-xs font-medium transition-colors disabled:opacity-50"
      >
        {isExtracting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Upload className="w-3.5 h-3.5" />
        )}
        {isExtracting ? "Extracting..." : "Upload file"}
      </button>
      {error && (
        <p className="text-grade-f text-xs mt-1">{error}</p>
      )}
    </div>
  );
}
