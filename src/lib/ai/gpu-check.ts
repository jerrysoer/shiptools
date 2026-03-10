export interface GpuCheckResult {
  supported: boolean;
  reason?: string;
}

/**
 * Deep WebGPU support check — probes requestAdapter() to catch
 * mobile browsers where "gpu" exists but no adapter is available.
 */
export async function checkWebGPUSupport(): Promise<GpuCheckResult> {
  if (typeof navigator === "undefined") {
    return { supported: false, reason: "ssr" };
  }

  if (!("gpu" in navigator)) {
    return { supported: false, reason: "no_webgpu_api" };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gpu = (navigator as any).gpu;
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      return { supported: false, reason: "no_adapter" };
    }
    return { supported: true };
  } catch (err) {
    return {
      supported: false,
      reason: err instanceof Error ? err.message : "adapter_error",
    };
  }
}
