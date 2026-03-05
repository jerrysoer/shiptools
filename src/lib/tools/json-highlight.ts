/**
 * Regex-based JSON syntax colorizer.
 * Returns HTML with <span> elements for keys, strings, numbers, booleans, and null.
 * Reused by JSON Formatter (D5) and JWT Decoder (E6).
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Colorize a JSON string with syntax highlighting spans.
 * Assumes input is already valid, pretty-printed JSON.
 */
export function highlightJson(json: string): string {
  return escapeHtml(json).replace(
    /("(?:\\.|[^"\\])*")\s*:/g, // keys
    '<span class="text-accent">$1</span>:'
  ).replace(
    /:\s*("(?:\\.|[^"\\])*")/g, // string values
    ': <span class="text-grade-a">$1</span>'
  ).replace(
    // Standalone string values in arrays (not preceded by colon)
    /(?<=[\[,]\s*)("(?:\\.|[^"\\])*")/g,
    '<span class="text-grade-a">$1</span>'
  ).replace(
    /\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, // numbers
    '<span class="text-amber-400">$1</span>'
  ).replace(
    /\b(true|false)\b/g, // booleans
    '<span class="text-purple-400">$1</span>'
  ).replace(
    /\b(null)\b/g, // null
    '<span class="text-text-tertiary">$1</span>'
  );
}
