"use client";

import { useState, useCallback, useMemo } from "react";
import { nanoid } from "nanoid";
import type { ConversionJob, ConversionOptions } from "@/lib/types";

type ConvertFn = (
  file: File,
  outputFormat: string,
  options?: ConversionOptions,
  onProgress?: (progress: number) => void
) => Promise<Blob>;

/**
 * Shared conversion state management hook.
 * Handles job queue, progress tracking, batch state, and download.
 */
export function useConverter(convertFn: ConvertFn) {
  const [jobs, setJobs] = useState<ConversionJob[]>([]);

  const updateJob = useCallback(
    (id: string, updates: Partial<ConversionJob>) => {
      setJobs((prev) =>
        prev.map((j) => (j.id === id ? { ...j, ...updates } : j))
      );
    },
    []
  );

  const addFiles = useCallback(
    (files: File[], outputFormat: string, options?: ConversionOptions) => {
      const newJobs: ConversionJob[] = files.map((file) => ({
        id: nanoid(),
        file,
        inputFormat: file.name.split(".").pop()?.toLowerCase() ?? "unknown",
        outputFormat,
        status: "pending" as const,
        progress: 0,
        options,
      }));
      setJobs((prev) => [...prev, ...newJobs]);
      return newJobs;
    },
    []
  );

  const processJob = useCallback(
    async (job: ConversionJob) => {
      updateJob(job.id, { status: "processing", progress: 0 });

      try {
        const result = await convertFn(
          job.file,
          job.outputFormat,
          job.options,
          (progress) => updateJob(job.id, { progress })
        );
        updateJob(job.id, { status: "done", progress: 100, result });
      } catch (err) {
        updateJob(job.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Conversion failed",
        });
      }
    },
    [convertFn, updateJob]
  );

  const processAll = useCallback(async () => {
    // Read latest jobs via functional setter to avoid stale closure
    let pending: ConversionJob[] = [];
    setJobs((current) => {
      pending = current.filter((j) => j.status === "pending");
      return current;
    });
    // Process sequentially to avoid memory pressure
    for (const job of pending) {
      await processJob(job);
    }
  }, [processJob]);

  const downloadResult = useCallback((job: ConversionJob) => {
    if (!job.result) return;

    const baseName = job.file.name.replace(/\.[^.]+$/, "");
    const fileName = `${baseName}.${job.outputFormat}`;
    const url = URL.createObjectURL(job.result);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const removeJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const clearJobs = useCallback(() => setJobs([]), []);

  // Batch state derived values
  const pendingCount = useMemo(
    () => jobs.filter((j) => j.status === "pending").length,
    [jobs]
  );

  const doneCount = useMemo(
    () => jobs.filter((j) => j.status === "done").length,
    [jobs]
  );

  const processingCount = useMemo(
    () => jobs.filter((j) => j.status === "processing").length,
    [jobs]
  );

  const totalCount = jobs.length;

  const isBatchComplete = useMemo(
    () =>
      totalCount > 0 &&
      pendingCount === 0 &&
      processingCount === 0 &&
      doneCount > 0,
    [totalCount, pendingCount, processingCount, doneCount]
  );

  const downloadAll = useCallback(async () => {
    const doneJobs = jobs.filter((j) => j.status === "done" && j.result);
    for (const job of doneJobs) {
      downloadResult(job);
      // Stagger downloads to avoid browser popup/download blockers
      await new Promise((r) => setTimeout(r, 300));
    }
  }, [jobs, downloadResult]);

  return {
    jobs,
    addFiles,
    processAll,
    processJob,
    downloadResult,
    removeJob,
    clearJobs,
    // Batch state
    pendingCount,
    doneCount,
    processingCount,
    totalCount,
    isBatchComplete,
    downloadAll,
  };
}
