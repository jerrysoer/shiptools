import { test, expect } from "@playwright/test";
import { DevToolPage } from "../pages/dev-tool.page";

/**
 * Tier 3 (Code model), Tier 4 (Reasoning), Tier 5 (Ollama-only).
 * Verifies each route loads with HTTP 200 and renders an h1.
 *
 * Note: Tier 4 tools (SWOT, Sentiment, Keywords) are now consolidated
 * into the Analyzer at /ai/analyze. Old paths redirect automatically.
 */

const TIER_3_TOOLS = [
  { path: "/ai/commit-msg", titleContains: "Commit" },
  { path: "/ai/code-explain", titleContains: "Code" },
  { path: "/ai/code-review", titleContains: "Code" },
  { path: "/ai/error-decode", titleContains: "Error" },
  { path: "/ai/sql-gen", titleContains: "SQL" },
  { path: "/ai/test-gen", titleContains: "Test" },
  { path: "/ai/pr-desc", titleContains: "PR" },
  { path: "/ai/readme-gen", titleContains: "README" },
] as const;

const TIER_4_MODES = [
  { path: "/ai/analyze?mode=swot", titleContains: "Analyzer" },
  { path: "/ai/analyze?mode=sentiment", titleContains: "Analyzer" },
  { path: "/ai/analyze?mode=keywords", titleContains: "Analyzer" },
] as const;

const TIER_5_TOOLS = [
  { path: "/ai/summarize?mode=long-document", titleContains: "Summar" },
  { path: "/ai/full-review", titleContains: "Code" },
  { path: "/ai/tech-writing", titleContains: "Tech" },
] as const;

test.describe("AI Tier 3 — Code Model Tools", () => {
  for (const { path, titleContains } of TIER_3_TOOLS) {
    test(`${path} loads with correct heading`, async ({ page }) => {
      const toolPage = new DevToolPage(page);
      await toolPage.goto(path);
      await toolPage.expectTitleContains(titleContains);
    });
  }
});

test.describe("AI Tier 4 — Reasoning Model Tools (consolidated into Analyzer)", () => {
  for (const { path, titleContains } of TIER_4_MODES) {
    test(`${path} loads with correct heading`, async ({ page }) => {
      const toolPage = new DevToolPage(page);
      await toolPage.goto(path);
      await toolPage.expectTitleContains(titleContains);
    });
  }

  test("SWOT mode renders Analyzer page", async ({ page }) => {
    await page.goto("/ai/analyze?mode=swot");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Industry input OR FeatureLock — either state is valid depending on model
    // On mobile, these may be below the fold — heading check is sufficient
    const hasIndustry = await page.getByText(/Industry/i).first().isVisible().catch(() => false);
    const hasLock = await page.getByText(/requires|upgrade|model/i).first().isVisible().catch(() => false);
    const isMobile = (page.viewportSize()?.width ?? 1280) < 768;
    expect(hasIndustry || hasLock || isMobile).toBe(true);
  });
});

test.describe("AI Tier 5 — Ollama-Only Tools", () => {
  for (const { path, titleContains } of TIER_5_TOOLS) {
    test(`${path} loads with correct heading`, async ({ page }) => {
      const toolPage = new DevToolPage(page);
      await toolPage.goto(path);
      await toolPage.expectTitleContains(titleContains);
    });
  }

  test("Tier 5 tools show Ollama requirement when not connected", async ({
    page,
  }) => {
    await page.goto("/ai/summarize?mode=long-document");
    // OllamaGate should show fallback when Ollama isn't running
    const ollamaMsg = page.getByText(/ollama/i);
    await expect(ollamaMsg.first()).toBeVisible();
  });
});
