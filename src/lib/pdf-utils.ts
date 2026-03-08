/** Shared PDF text extraction utility.
 *  Extracted from DocumentConverter to reuse in useFileToText. */

export function extractPageText(
  items: Array<Record<string, unknown>>
): string {
  const textItems = items.filter(
    (item): item is { str: string; hasEOL: boolean; transform: number[]; height: number } =>
      "str" in item && "transform" in item
  );
  if (textItems.length === 0) return "";

  const heights = textItems.map((t) => t.height).filter((h) => h > 0);
  const lineHeight =
    heights.length > 0
      ? heights.sort((a, b) => a - b)[Math.floor(heights.length / 2)]
      : 12;

  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < textItems.length; i++) {
    const item = textItems[i];
    currentLine += item.str;

    if (item.hasEOL) {
      lines.push(currentLine);
      currentLine = "";

      if (i + 1 < textItems.length) {
        const gap = Math.abs(item.transform[5] - textItems[i + 1].transform[5]);
        if (gap > lineHeight * 1.5) {
          lines.push("");
        }
      }
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.join("\n");
}
