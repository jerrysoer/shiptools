import { describe, it, expect } from "vitest";
import { buildClassName } from "./Button";

describe("Button — buildClassName", () => {
  describe("Variants", () => {
    it("applies primary variant classes by default", () => {
      const result = buildClassName({});
      expect(result).toContain("bg-accent");
      expect(result).toContain("text-accent-fg");
      expect(result).toContain("hover:bg-accent-hover");
    });

    it("applies secondary variant classes", () => {
      const result = buildClassName({ variant: "secondary" });
      expect(result).toContain("border-2");
      expect(result).toContain("border-text-primary");
      expect(result).toContain("hover:bg-bg-surface");
      expect(result).not.toContain("bg-accent");
    });

    it("applies ghost variant classes", () => {
      const result = buildClassName({ variant: "ghost" });
      expect(result).toContain("text-text-secondary");
      expect(result).toContain("hover:text-text-primary");
      expect(result).not.toContain("bg-accent");
      expect(result).not.toContain("border-2");
    });
  });

  describe("Sizes", () => {
    it("applies md size by default", () => {
      const result = buildClassName({});
      expect(result).toContain("px-6");
      expect(result).toContain("py-3");
    });

    it("applies sm size classes", () => {
      const result = buildClassName({ size: "sm" });
      expect(result).toContain("px-5");
      expect(result).toContain("py-2.5");
      expect(result).toContain("text-sm");
      expect(result).not.toContain("px-6");
    });
  });

  describe("Mono prop", () => {
    it("does not include mono classes by default", () => {
      const result = buildClassName({});
      expect(result).not.toContain("font-mono");
      expect(result).not.toContain("tracking-wider");
      expect(result).not.toContain("uppercase");
    });

    it("includes mono classes when mono is true", () => {
      const result = buildClassName({ mono: true });
      expect(result).toContain("font-mono");
      expect(result).toContain("tracking-wider");
      expect(result).toContain("uppercase");
    });
  });

  describe("Base classes", () => {
    it("always includes base layout and transition classes", () => {
      const result = buildClassName({});
      expect(result).toContain("inline-flex");
      expect(result).toContain("items-center");
      expect(result).toContain("justify-center");
      expect(result).toContain("gap-2");
      expect(result).toContain("transition-colors");
      expect(result).toContain("disabled:opacity-50");
    });
  });

  describe("Custom className", () => {
    it("appends custom className", () => {
      const result = buildClassName({ className: "mt-4 w-full" });
      expect(result).toContain("mt-4");
      expect(result).toContain("w-full");
    });

    it("does not include empty strings in output", () => {
      const result = buildClassName({});
      expect(result).not.toContain("  ");
    });
  });

  describe("No border radius", () => {
    it("never includes any rounded classes", () => {
      const variants = ["primary", "secondary", "ghost"] as const;
      const sizes = ["sm", "md"] as const;

      for (const variant of variants) {
        for (const size of sizes) {
          const result = buildClassName({ variant, size, mono: true });
          expect(result).not.toMatch(/rounded/);
        }
      }
    });
  });
});
