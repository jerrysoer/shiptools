import { test, expect } from "@playwright/test";

test.describe("Navigation & Cross-Cutting", () => {
  // ─── Write Tab (/write) ────────────────────────────────────────────

  test("write page shows Writing and Analysis groups", async ({ page }) => {
    await page.goto("/write");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Write & Analyze");

    // Use accordion button roles to avoid strict mode violations (tool names can match group names)
    await expect(page.getByRole("button", { name: /^Writing/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Analysis/ })).toBeVisible();
  });

  test("write page has Quick AI Tools section", async ({ page }) => {
    await page.goto("/write");

    await expect(page.getByText("Quick AI Tools")).toBeVisible();
    // Target the Quick AI card links by their exact visible title text
    await expect(page.getByRole("link", { name: /^Summarize/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Rewrite/ })).toBeVisible();
  });

  test("write page lists consolidated AI writing tools", async ({ page }) => {
    await page.goto("/write");

    await expect(page.getByText("Writer")).toBeVisible();
    await expect(page.getByText("Analyzer")).toBeVisible();
  });

  // ─── Code Tab (/tools) ────────────────────────────────────────────

  test("code page shows development tool groups", async ({ page }) => {
    await page.goto("/tools");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Code & Development");

    await expect(page.getByRole("button", { name: /AI Code Tools/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Code Utilities/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Data & Encode/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /DevOps & System/ })).toBeVisible();
  });

  test("code page lists developer tools", async ({ page }) => {
    await page.goto("/tools");

    await expect(page.getByText("SQL Formatter")).toBeVisible();
    await expect(page.getByText("IP / Subnet Calculator")).toBeVisible();
    await expect(page.getByText("Unit Converter")).toBeVisible();
    await expect(page.getByText("User-Agent Parser")).toBeVisible();
  });

  test("code page lists config tools", async ({ page }) => {
    await page.goto("/tools");

    await expect(page.getByText(".env Validator")).toBeVisible();
    await expect(page.getByText("robots.txt Generator")).toBeVisible();
    await expect(page.getByText("CSP Header Builder")).toBeVisible();
  });

  test("code page lists AI code tools with badges", async ({ page }) => {
    await page.goto("/tools");

    await expect(page.getByText("Code Reviewer")).toBeVisible();
    await expect(page.getByText("SQL Generator")).toBeVisible();
    await expect(page.getByText("Error Decoder")).toBeVisible();
  });

  test("code page search filters tools", async ({ page }) => {
    await page.goto("/tools");

    const searchInput = page.getByPlaceholder("Search tools...");
    await searchInput.fill("JSON");

    await expect(page.getByText("JSON Formatter")).toBeVisible();
    await expect(page.getByText("JSON / YAML / TOML Converter")).toBeVisible();
    // Non-matching group should be hidden
    await expect(page.getByText("DevOps & System")).not.toBeVisible();
  });

  test("TOML converter is listed in Data & Encode", async ({ page }) => {
    await page.goto("/tools");
    await expect(page.getByText("TOML Converter")).toBeVisible();
  });

  // ─── Media Tab (/media) ───────────────────────────────────────────

  test("media page shows record and convert groups", async ({ page }) => {
    await page.goto("/media");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Media & Files");

    await expect(page.getByRole("button", { name: /Record/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Convert Media/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Documents/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Design/ })).toBeVisible();
  });

  test("media page lists recording and conversion tools", async ({ page }) => {
    await page.goto("/media");

    await expect(page.getByText("Audio Recorder")).toBeVisible();
    await expect(page.getByText("Screen Recorder")).toBeVisible();
    await expect(page.getByText("Image Converter")).toBeVisible();
    await expect(page.getByText("Sign PDFs")).toBeVisible();
  });

  // ─── Protect Tab (/protect) ───────────────────────────────────────

  test("protect page shows security and privacy groups", async ({ page }) => {
    await page.goto("/protect");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Security & Privacy");

    await expect(page.getByText("Security & Crypto")).toBeVisible();
    await expect(page.getByText("Privacy & Data Protection")).toBeVisible();
  });

  test("protect page has Privacy Audit hero card linking to /audit", async ({ page }) => {
    await page.goto("/protect");

    await expect(page.getByText("Privacy Audit")).toBeVisible();
    await expect(page.getByText("Scan any website")).toBeVisible();
    const auditLink = page.getByRole("link", { name: /Privacy Audit/ });
    await expect(auditLink).toHaveAttribute("href", "/audit");
  });

  test("/audit page renders scan form", async ({ page }) => {
    await page.goto("/audit");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Privacy Audit/i);
    await expect(page.getByPlaceholder("e.g. example.com")).toBeVisible();
    await expect(page.getByRole("button", { name: /Scan/ })).toBeVisible();
  });

  test("protect page lists security tools", async ({ page }) => {
    await page.goto("/protect");

    await expect(page.getByText("Password Generator")).toBeVisible();
    await expect(page.getByText("JWT Decoder")).toBeVisible();
    await expect(page.getByText("Browser Fingerprint")).toBeVisible();
  });

  // ─── Redirects ────────────────────────────────────────────────────

  test("/ai redirects to /tools", async ({ page }) => {
    await page.goto("/ai");
    await page.waitForURL("/tools");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Code & Development");
  });

  test("/record redirects to /media", async ({ page }) => {
    await page.goto("/record");
    await page.waitForURL("/media");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Media & Files");
  });

  test("/convert redirects to /media", async ({ page }) => {
    await page.goto("/convert");
    await page.waitForURL("/media");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Media & Files");
  });

  // ─── Homepage ─────────────────────────────────────────────────────

  test("homepage shows 4 department cards", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("No. 01")).toBeVisible();
    await expect(page.getByText("No. 02")).toBeVisible();
    await expect(page.getByText("No. 03")).toBeVisible();
    await expect(page.getByText("No. 04")).toBeVisible();
  });
});
