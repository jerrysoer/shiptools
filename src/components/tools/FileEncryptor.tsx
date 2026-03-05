"use client";

import { useState, useCallback } from "react";
import { Lock, Unlock, Eye, EyeOff, Download, RotateCcw } from "lucide-react";
import DropZone from "@/components/DropZone";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { encryptFile, decryptFile } from "@/lib/tools/crypto";
import { MAX_ENCRYPT_SIZE } from "@/lib/constants";

type Mode = "encrypt" | "decrypt";

export default function FileEncryptor() {
  const [mode, setMode] = useState<Mode>("encrypt");
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleFiles = useCallback(
    (files: File[]) => {
      const f = files[0];
      setFile(f);
      setError(null);
      setDone(false);

      // Auto-detect mode from .enc extension
      if (f.name.endsWith(".enc")) {
        setMode("decrypt");
      }
    },
    []
  );

  const handleProcess = useCallback(async () => {
    if (!file || !password) return;

    setProcessing(true);
    setError(null);
    setDone(false);

    try {
      const buffer = await file.arrayBuffer();
      let result: ArrayBuffer;
      let outputName: string;

      if (mode === "encrypt") {
        result = await encryptFile(buffer, password);
        outputName = `${file.name}.enc`;
      } else {
        result = await decryptFile(buffer, password);
        outputName = file.name.endsWith(".enc")
          ? file.name.slice(0, -4)
          : `${file.name}.dec`;
      }

      // Trigger download
      const blob = new Blob([result]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = outputName;
      a.click();
      URL.revokeObjectURL(url);

      setDone(true);
    } catch {
      setError(
        mode === "decrypt"
          ? "Decryption failed. Wrong password or corrupted file."
          : "Encryption failed. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  }, [file, password, mode]);

  const handleReset = useCallback(() => {
    setFile(null);
    setPassword("");
    setShowPassword(false);
    setError(null);
    setDone(false);
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <ToolPageHeader
        icon={Lock}
        title="File Encryption"
        description="Encrypt and decrypt files with AES-256-GCM. Password-based key derivation with PBKDF2."
      />

      <div className="space-y-5">

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-bg-surface border border-border rounded-lg w-fit">
        <button
          onClick={() => {
            setMode("encrypt");
            setError(null);
            setDone(false);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "encrypt"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Lock className="w-4 h-4" />
          Encrypt
        </button>
        <button
          onClick={() => {
            setMode("decrypt");
            setError(null);
            setDone(false);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "decrypt"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Unlock className="w-4 h-4" />
          Decrypt
        </button>
      </div>

      {/* Drop zone */}
      <DropZone
        accept="*/*"
        maxSize={MAX_ENCRYPT_SIZE}
        onFiles={handleFiles}
        multiple={false}
        label={
          mode === "encrypt"
            ? "Drop a file to encrypt"
            : "Drop an .enc file to decrypt"
        }
      />

      {/* Selected file info */}
      {file && (
        <div className="bg-bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{file.name}</p>
              <p className="text-text-tertiary text-xs">
                {formatSize(file.size)}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="text-text-tertiary hover:text-text-secondary p-1"
              title="Clear"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Password input */}
      <div>
        <label
          htmlFor="encrypt-password"
          className="block text-sm font-medium mb-1.5"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="encrypt-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              mode === "encrypt"
                ? "Enter a strong password"
                : "Enter the password used to encrypt"
            }
            className="w-full bg-bg-surface border border-border rounded-lg px-4 py-2.5 pr-10 text-sm font-mono placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Action button */}
      <button
        onClick={handleProcess}
        disabled={!file || !password || processing}
        className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-colors"
      >
        {processing ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {mode === "encrypt" ? "Encrypting..." : "Decrypting..."}
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            {mode === "encrypt" ? "Encrypt & Download" : "Decrypt & Download"}
          </>
        )}
      </button>

      {/* Success message */}
      {done && (
        <p className="text-grade-a text-sm">
          {mode === "encrypt"
            ? "File encrypted and downloaded."
            : "File decrypted and downloaded."}
        </p>
      )}

      {/* Error */}
      {error && <p className="text-grade-f text-sm">{error}</p>}

      {/* Info box */}
      <div className="bg-bg-surface border border-border rounded-xl p-4 text-xs text-text-tertiary space-y-1">
        <p>
          <strong className="text-text-secondary">Algorithm:</strong>{" "}
          AES-256-GCM with PBKDF2 key derivation (100K iterations, SHA-256)
        </p>
        <p>
          <strong className="text-text-secondary">Format:</strong> Salt (16B) +
          IV (12B) + ciphertext. Output has <code>.enc</code> extension.
        </p>
        <p>
          <strong className="text-text-secondary">Max file size:</strong>{" "}
          {MAX_ENCRYPT_SIZE / (1024 * 1024)}MB
        </p>
      </div>
      </div>
    </div>
  );
}
