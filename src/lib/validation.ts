import { z } from "zod";
import { resolve } from "dns/promises";

const urlSchema = z.object({
  url: z
    .string()
    .min(1, "URL is required")
    .transform((val) => {
      // Add protocol if missing
      if (!/^https?:\/\//i.test(val)) return `https://${val}`;
      return val;
    })
    .pipe(z.string().url("Invalid URL format"))
    .transform((val) => {
      const parsed = new URL(val);
      // Force HTTPS
      parsed.protocol = "https:";
      return parsed.toString();
    }),
  force: z.boolean().optional(),
});

export function parseScanRequest(body: unknown) {
  return urlSchema.safeParse(body);
}

// Private IP ranges for SSRF prevention
const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^fd/i,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_RANGES.some((range) => range.test(ip));
}

/**
 * Validate that a URL doesn't resolve to a private IP (SSRF prevention).
 * Resolves the hostname and checks against private ranges.
 */
export async function validateNotSSRF(url: string): Promise<boolean> {
  try {
    const { hostname } = new URL(url);

    // Reject obvious private hostnames
    if (
      hostname === "localhost" ||
      hostname === "0.0.0.0" ||
      isPrivateIp(hostname)
    ) {
      return false;
    }

    // Resolve DNS and check IPs
    const addresses = await resolve(hostname);
    for (const addr of addresses) {
      if (isPrivateIp(addr)) return false;
    }

    return true;
  } catch {
    // DNS resolution failure — block it
    return false;
  }
}
