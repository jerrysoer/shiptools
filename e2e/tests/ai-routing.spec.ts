import { test, expect } from "@playwright/test";
import { AIToolPage } from "../pages/ai-tool.page";

test.describe("AI Tool Routing & Nav Highlighting", () => {
  // ─── Quick tool pages render (not redirect) ──────────────────────────

  const QUICK_TOOLS = [
    { href: "/ai/summarize", expectedHeading: /summar/i },
    { href: "/ai/rewrite", expectedHeading: /rewrit/i },
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

  // ─── Nav tab highlighting ─────────────────────────────────────────────

  const WRITE_AI_ROUTES = [
    "/ai/summarize",
    "/ai/rewrite",
    "/ai/email",
    "/ai/social",
  ] as const;

  const CODE_AI_ROUTES = [
    "/ai/code-review",
    "/ai/commit-msg",
    "/ai/sql-gen",
  ] as const;

  for (const route of WRITE_AI_ROUTES) {
    test(`${route} highlights Write tab`, async ({ page }) => {
      const toolPage = new AIToolPage(page);
      await page.goto(route);
      await toolPage.expectNavHighlight("Write");
    });
  }

  for (const route of CODE_AI_ROUTES) {
    test(`${route} highlights Code tab`, async ({ page }) => {
      const toolPage = new AIToolPage(page);
      await page.goto(route);
      await toolPage.expectNavHighlight("Code");
    });
  }

  // ─── Write page quick tool cards ──────────────────────────────────────

  test("Summarize quick tool links to /ai/summarize", async ({ page }) => {
    await page.goto("/write");
    const summarizeCard = page.getByRole("link", { name: /Summarize/ });
    await summarizeCard.click();
    await expect(page).toHaveURL("/ai/summarize");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("Rewrite quick tool links to /ai/rewrite", async ({ page }) => {
    await page.goto("/write");
    const rewriteCard = page.getByRole("link", { name: /Rewrite/ });
    await rewriteCard.click();
    await expect(page).toHaveURL("/ai/rewrite");
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

  test("/ai/summarize?mode=privacy-policy activates privacy mode", async ({
    page,
  }) => {
    await page.goto("/ai/summarize?mode=privacy-policy");
    // The Privacy Policy mode button should be active (accent background)
    const privacyBtn = page.getByRole("button", { name: "Privacy Policy" });
    await expect(privacyBtn).toBeVisible();
  });
});
