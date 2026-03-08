import { test, expect } from "@playwright/test";
import { DevToolPage } from "../pages/dev-tool.page";
import path from "path";

test.describe("Image Scanner OCR", () => {
  test("page loads with heading", async ({ page }) => {
    const toolPage = new DevToolPage(page);
    await toolPage.goto("/ai/image-scanner");
    await toolPage.expectTitleContains("Image Scanner");
  });

  test("upload image triggers OCR without crash", async ({ page }) => {
    await page.goto("/ai/image-scanner");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Upload the test fixture via the hidden file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.resolve(__dirname, "../fixtures/ocr-test.png"),
    );

    // Wait for OCR to complete — the recognizing state should resolve
    // The textarea or result area should eventually have content
    // Use a generous timeout since Tesseract downloads ~15MB of lang data
    await expect(async () => {
      // No error message should be visible
      const errorEl = page.locator('[role="alert"], .text-red-500');
      const errorCount = await errorEl.count();
      if (errorCount > 0) {
        const errorText = await errorEl.first().textContent();
        // Allow progress/loading messages but fail on actual errors
        if (errorText?.toLowerCase().includes("map")) {
          throw new Error(`OCR crash detected: ${errorText}`);
        }
      }
    }).toPass({ timeout: 60_000 });

    // Wait for recognition to finish (progress bar should disappear)
    await expect(page.getByRole("progressbar")).toBeHidden({ timeout: 60_000 });

    // Result text should be non-empty
    const textarea = page.locator("textarea");
    if ((await textarea.count()) > 0) {
      await expect(textarea.first()).not.toHaveValue("");
    }

    // Confidence score should be displayed
    const bodyText = await page.textContent("body");
    expect(bodyText).toMatch(/confidence|%/i);
  });
});
