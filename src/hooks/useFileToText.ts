"use client";

import { useState, useCallback } from "react";

export interface UseFileToTextReturn {
  isExtracting: boolean;
  error: string | null;
  extractFromFile: (file: File) => Promise<string>;
}

const TEXT_EXTENSIONS = new Set(["txt", "md", "csv", "json", "html", "xml"]);

const ACCEPT =
  ".pdf,.docx,.xlsx,.csv,.txt,.md,.json,.html,.xml";

export { ACCEPT as FILE_TEXT_ACCEPT };

export function useFileToText(): UseFileToTextReturn {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractFromFile = useCallback(async (file: File): Promise<string> => {
    setError(null);
    setIsExtracting(true);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

      // Plain text formats — native File.text()
      if (TEXT_EXTENSIONS.has(ext)) {
        return await file.text();
      }

      // PDF — pdfjs-dist (lazy)
      if (ext === "pdf") {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        const { extractPageText } = await import("@/lib/pdf-utils");
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
        const parts: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          parts.push(extractPageText(content.items));
        }

        const text = parts.join("\n\n");
        if (!text.trim()) {
          throw new Error("No extractable text found. This PDF may be a scanned document.");
        }
        return text;
      }

      // DOCX — mammoth (lazy)
      if (ext === "docx") {
        const mammoth = await import("mammoth");
        const buffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        return result.value;
      }

      // XLSX — SheetJS (lazy)
      if (ext === "xlsx") {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const parts: string[] = [];

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          parts.push(`--- ${sheetName} ---`);
          parts.push(XLSX.utils.sheet_to_csv(sheet));
        }

        return parts.join("\n\n");
      }

      throw new Error(`Unsupported file type: .${ext}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to extract text from file.";
      setError(message);
      throw err;
    } finally {
      setIsExtracting(false);
    }
  }, []);

  return { isExtracting, error, extractFromFile };
}
