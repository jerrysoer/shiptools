/**
 * Invisible character database and detection for text analysis.
 */

export interface InvisibleChar {
  char: string;
  code: string;
  name: string;
  category: "zero-width" | "bidi" | "formatting" | "homoglyph";
}

/** Zero-width and invisible control characters */
const INVISIBLE_CHARS: Record<string, { name: string; category: InvisibleChar["category"] }> = {
  "\u200B": { name: "Zero Width Space", category: "zero-width" },
  "\u200C": { name: "Zero Width Non-Joiner", category: "zero-width" },
  "\u200D": { name: "Zero Width Joiner", category: "zero-width" },
  "\uFEFF": { name: "Zero Width No-Break Space (BOM)", category: "zero-width" },
  "\u2060": { name: "Word Joiner", category: "zero-width" },
  "\u00AD": { name: "Soft Hyphen", category: "zero-width" },
  "\u034F": { name: "Combining Grapheme Joiner", category: "zero-width" },
  "\u2061": { name: "Function Application", category: "zero-width" },
  "\u2062": { name: "Invisible Times", category: "zero-width" },
  "\u2063": { name: "Invisible Separator", category: "zero-width" },
  "\u2064": { name: "Invisible Plus", category: "zero-width" },
  // Bidi controls
  "\u202A": { name: "Left-to-Right Embedding", category: "bidi" },
  "\u202B": { name: "Right-to-Left Embedding", category: "bidi" },
  "\u202C": { name: "Pop Directional Formatting", category: "bidi" },
  "\u202D": { name: "Left-to-Right Override", category: "bidi" },
  "\u202E": { name: "Right-to-Left Override", category: "bidi" },
  "\u2066": { name: "Left-to-Right Isolate", category: "bidi" },
  "\u2067": { name: "Right-to-Left Isolate", category: "bidi" },
  "\u2068": { name: "First Strong Isolate", category: "bidi" },
  "\u2069": { name: "Pop Directional Isolate", category: "bidi" },
  "\u200E": { name: "Left-to-Right Mark", category: "bidi" },
  "\u200F": { name: "Right-to-Left Mark", category: "bidi" },
};

/** Common Cyrillic/Greek homoglyphs that look like Latin letters */
export const HOMOGLYPHS: Record<string, { latin: string; script: string }> = {
  "\u0410": { latin: "A", script: "Cyrillic" },
  "\u0412": { latin: "B", script: "Cyrillic" },
  "\u0421": { latin: "C", script: "Cyrillic" },
  "\u0415": { latin: "E", script: "Cyrillic" },
  "\u041D": { latin: "H", script: "Cyrillic" },
  "\u041A": { latin: "K", script: "Cyrillic" },
  "\u041C": { latin: "M", script: "Cyrillic" },
  "\u041E": { latin: "O", script: "Cyrillic" },
  "\u0420": { latin: "P", script: "Cyrillic" },
  "\u0422": { latin: "T", script: "Cyrillic" },
  "\u0425": { latin: "X", script: "Cyrillic" },
  "\u0430": { latin: "a", script: "Cyrillic" },
  "\u0435": { latin: "e", script: "Cyrillic" },
  "\u043E": { latin: "o", script: "Cyrillic" },
  "\u0440": { latin: "p", script: "Cyrillic" },
  "\u0441": { latin: "c", script: "Cyrillic" },
  "\u0443": { latin: "y", script: "Cyrillic" },
  "\u0445": { latin: "x", script: "Cyrillic" },
  // Greek
  "\u0391": { latin: "A", script: "Greek" },
  "\u0392": { latin: "B", script: "Greek" },
  "\u0395": { latin: "E", script: "Greek" },
  "\u0397": { latin: "H", script: "Greek" },
  "\u0399": { latin: "I", script: "Greek" },
  "\u039A": { latin: "K", script: "Greek" },
  "\u039C": { latin: "M", script: "Greek" },
  "\u039D": { latin: "N", script: "Greek" },
  "\u039F": { latin: "O", script: "Greek" },
  "\u03A1": { latin: "P", script: "Greek" },
  "\u03A4": { latin: "T", script: "Greek" },
  "\u03BF": { latin: "o", script: "Greek" },
};

export interface DetectionResult {
  chars: InvisibleChar[];
  counts: Record<InvisibleChar["category"], number>;
  total: number;
}

/**
 * Scan text for invisible characters and homoglyphs.
 */
export function detectInvisible(text: string): DetectionResult {
  const chars: InvisibleChar[] = [];
  const counts: Record<InvisibleChar["category"], number> = {
    "zero-width": 0,
    bidi: 0,
    formatting: 0,
    homoglyph: 0,
  };

  for (const ch of text) {
    const entry = INVISIBLE_CHARS[ch];
    if (entry) {
      chars.push({
        char: ch,
        code: `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`,
        name: entry.name,
        category: entry.category,
      });
      counts[entry.category]++;
    } else if (HOMOGLYPHS[ch]) {
      const h = HOMOGLYPHS[ch];
      chars.push({
        char: ch,
        code: `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`,
        name: `${h.script} "${h.latin}" lookalike`,
        category: "homoglyph",
      });
      counts.homoglyph++;
    }
  }

  return { chars, counts, total: chars.length };
}

/**
 * Strip all invisible characters and replace homoglyphs with Latin equivalents.
 */
export function cleanText(text: string): string {
  let result = "";
  for (const ch of text) {
    if (INVISIBLE_CHARS[ch]) continue;
    const h = HOMOGLYPHS[ch];
    if (h) {
      result += h.latin;
    } else {
      result += ch;
    }
  }
  return result;
}
