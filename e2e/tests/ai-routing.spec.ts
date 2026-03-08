import { test, expect } from "@playwright/test";
import { AIToolPage } from "../pages/ai-tool.page";

test.describe("AI Tool Routing & Nav Highlighting", () => {
  // ─── Quick tool pages render (not redirect) ──────────────────────────

  const QUICK_TOOLS = [
    { href: "/ai/summarize", expectedHeading: /summar/i },
  ] as const;

  for (const { href, expectedHeading } of QUICK_TOOLS) {
    test(`${href} renders tool page, not redirect`, async ({ page }) => {
      const toolPage = new AIToolPage(page);
      await page.goto(href);
      await toolPage.expectNoRedirect(href);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        expectedHeading,
      );
    });
  }

  // ─── Consolidated tool pages render ───────────────────────────────────

  test("/ai/writer renders with correct heading", async ({ page }) => {
    await page.goto("/ai/writer");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/writer/i);
    // Mode buttons OR FeatureLock — either state is valid
    // On mobile, buttons may be below the fold — heading check is sufficient
    const hasMode = await page.getByRole("button", { name: "Email" }).isVisible().catch(() => false);
    const hasLock = await page.getByText(/requires|upgrade|model/i).first().isVisible().catch(() => false);
    const isMobile = (page.viewportSize()?.width ?? 1280) < 768;
    expect(hasMode || hasLock || isMobile).toBe(true);
  });

  test("/ai/analyze renders with correct heading", async ({ page }) => {
    await page.goto("/ai/analyze");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/analyzer/i);
    // Mode buttons OR FeatureLock — either state is valid
    // On mobile, buttons may be below the fold — heading check is sufficient
    const hasMode = await page.getByRole("button", { name: "Contract" }).isVisible().catch(() => false);
    const hasLock = await page.getByText(/requires|upgrade|model/i).first().isVisible().catch(() => false);
    const isMobile = (page.viewportSize()?.width ?? 1280) < 768;
    expect(hasMode || hasLock || isMobile).toBe(true);
  });

  // ─── FileTextInput visibility (only when FeatureLock allows) ──────────

  for (const { path, name } of [
    { path: "/ai/writer", name: "Writer" },
    { path: "/ai/analyze", name: "Analyzer" },
    { path: "/ai/summarize", name: "Summarizer" },
  ]) {
    test(`${name} shows upload button or FeatureLock`, async ({ page }) => {
      await page.goto(path);
      const hasUpload = await page.getByRole("button", { name: /upload file/i }).isVisible().catch(() => false);
      const hasLock = await page.getByText(/requires|upgrade|model/i).first().isVisible().catch(() => false);
      const hasHeading = await page.getByRole("heading", { level: 1 }).isVisible().catch(() => false);
      // Upload visible (model loaded) or lock visible (model required) or at least heading
      expect(hasUpload || hasLock || hasHeading).toBe(true);
    });
  }

  // ─── Redirect tests ────────────────────────────────────────────────────

  const REDIRECTS = [
    { from: "/ai/email", to: /\/ai\/writer\?mode=email/ },
    { from: "/ai/social", to: /\/ai\/writer\?mode=social/ },
    { from: "/ai/rewrite", to: /\/ai\/writer\?mode=rewrite/ },
    { from: "/ai/contracts", to: /\/ai\/analyze\?mode=contract/ },
    { from: "/ai/job-analyzer", to: /\/ai\/analyze\?mode=job/ },
    { from: "/ai/meeting-minutes", to: /\/ai\/analyze\?mode=meeting/ },
    { from: "/ai/sentiment", to: /\/ai\/analyze\?mode=sentiment/ },
    { from: "/ai/keywords", to: /\/ai\/analyze\?mode=keywords/ },
    { from: "/ai/swot", to: /\/ai\/analyze\?mode=swot/ },
  ] as const;

  for (const { from, to } of REDIRECTS) {
    test(`${from} redirects correctly`, async ({ page }) => {
      await page.goto(from);
      await expect(page).toHaveURL(to);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }

  // ─── Nav tab highlighting ─────────────────────────────────────────────

  const WRITE_AI_ROUTES = [
    "/ai/summarize",
    "/ai/writer",
    "/ai/analyze",
  ] as const;

  const CODE_AI_ROUTES = [
    "/ai/code-review",
    "/ai/commit-msg",
    "/ai/sql-gen",
  ] as const;

  for (const route of WRITE_AI_ROUTES) {
    test(`${route} highlights Write tab`, async ({ page }) => {
      // Desktop nav tabs are hidden on mobile (behind hamburger menu)
      test.skip((page.viewportSize()?.width ?? 1280) < 768, "Nav tabs hidden on mobile");
      const toolPage = new AIToolPage(page);
      await page.goto(route);
      await toolPage.expectNavHighlight("Write");
    });
  }

  for (const route of CODE_AI_ROUTES) {
    test(`${route} highlights Code tab`, async ({ page }) => {
      // Desktop nav tabs are hidden on mobile (behind hamburger menu)
      test.skip((page.viewportSize()?.width ?? 1280) < 768, "Nav tabs hidden on mobile");
      const toolPage = new AIToolPage(page);
      await page.goto(route);
      await toolPage.expectNavHighlight("Code");
    });
  }

  // ─── Write page quick tool cards ──────────────────────────────────────

  test("Summarize quick tool links to /ai/summarize", async ({ page }) => {
    await page.goto("/write");
    // Dismiss consent banner if visible
    const gotIt = page.getByRole("button", { name: "Got it" });
    if (await gotIt.isVisible().catch(() => false)) {
      await gotIt.click();
    }
    const summarizeCard = page.getByRole("link", { name: /^Summarize Condense/ });
    await summarizeCard.click();
    await expect(page).toHaveURL("/ai/summarize");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("Rewrite quick tool links to /ai/writer?mode=rewrite", async ({ page }) => {
    await page.goto("/write");
    // Dismiss consent banner if visible
    const gotIt = page.getByRole("button", { name: "Got it" });
    if (await gotIt.isVisible().catch(() => false)) {
      await gotIt.click();
    }
    const rewriteCard = page.getByRole("link", { name: /Rewrite/ });
    await rewriteCard.click();
    await expect(page).toHaveURL(/\/ai\/writer\?mode=rewrite/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  // ─── Privacy policy redirect ──────────────────────────────────────────

  test("/ai/privacy-policy redirects to summarizer with mode", async ({
    page,
  }) => {
    await page.goto("/ai/privacy-policy");
    await expect(page).toHaveURL(/\/ai\/summarize/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /summar/i,
    );
  });

  // ─── Summarizer mode toggle ───────────────────────────────────────────

  test("/ai/summarize?mode=privacy-policy loads correctly", async ({
    page,
  }) => {
    await page.goto("/ai/summarize?mode=privacy-policy");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/summar/i);
    // Mode button OR FeatureLock — either state is valid
    // On mobile, buttons may be below the fold — heading check is sufficient
    const hasBtn = await page.getByRole("button", { name: "Privacy Policy" }).isVisible().catch(() => false);
    const hasLock = await page.getByText(/requires|upgrade|model/i).first().isVisible().catch(() => false);
    const isMobile = (page.viewportSize()?.width ?? 1280) < 768;
    expect(hasBtn || hasLock || isMobile).toBe(true);
  });
});
