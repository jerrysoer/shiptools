import { createHash } from "crypto";

const IP_HASH_SALT = process.env.IP_HASH_SALT;

if (!IP_HASH_SALT) {
  console.warn("[hash] IP_HASH_SALT not set — using insecure default. Set this in production.");
}

const SALT = IP_HASH_SALT || "dev-only-insecure-salt";

export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(`${SALT}:${ip}`)
    .digest("hex")
    .slice(0, 16);
}
