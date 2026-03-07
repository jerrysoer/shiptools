import { test, expect } from "@playwright/test";

test.describe("Navigation & Cross-Cutting", () => {
  test("tools page shows unified hub with functional groups", async ({ page }) => {
    await page.goto("/tools");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Tool Hub");

    // Verify functional groups are rendered
    await expect(page.getByText("Writing & Communication")).toBeVisible();
    await expect(page.getByText("Code & Development")).toBeVisible();
    await expect(page.getByText("Documents & Analysis")).toBeVisible();
    await expect(page.getByText("Encode & Transform")).toBeVisible();
    await expect(page.getByText("Security & Crypto")).toBeVisible();
    await expect(page.getByText("Privacy & Inspection")).toBeVisible();
    await expect(page.getByText("System & DevOps")).toBeVisible();
  });

  test("tools page lists developer tools", async ({ page }) => {
    await page.goto("/tools");

    await expect(page.getByText("SQL Formatter")).toBeVisible();
    await expect(page.getByText("IP / Subnet Calculator")).toBeVisible();
    await expect(page.getByText("Unit Converter")).toBeVisible();
    await expect(page.getByText("User-Agent Parser")).toBeVisible();
  });

  test("tools page lists config tools", async ({ page }) => {
    await page.goto("/tools");

    await expect(page.getByText(".env Validator")).toBeVisible();
    await expect(page.getByText("robots.txt Generator")).toBeVisible();
    await expect(page.getByText("CSP Header Builder")).toBeVisible();
  });

  test("tools page lists AI tools with badges", async ({ page }) => {
    await page.goto("/tools");

    await expect(page.getByText("Code Reviewer")).toBeVisible();
    await expect(page.getByText("Email Composer")).toBeVisible();
    await expect(page.getByText("SWOT Analyzer")).toBeVisible();
  });

  test("tools page has Quick AI Tools section", async ({ page }) => {
    await page.goto("/tools");

    await expect(page.getByText("Quick AI Tools")).toBeVisible();
    await expect(page.getByText("Summarize")).toBeVisible();
    await expect(page.getByText("Rewrite")).toBeVisible();
  });

  test("tools page search filters tools", async ({ page }) => {
    await page.goto("/tools");

    const searchInput = page.getByPlaceholder("Search tools...");
    await searchInput.fill("JSON");

    await expect(page.getByText("JSON Formatter")).toBeVisible();
    await expect(page.getByText("JSON / YAML / TOML Converter")).toBeVisible();
    // Non-matching group should be hidden
    await expect(page.getByText("Security & Crypto")).not.toBeVisible();
  });

  test("/ai redirects to /tools", async ({ page }) => {
    await page.goto("/ai");
    await page.waitForURL("/tools");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Tool Hub");
  });

  test("TOML converter is listed in Encode & Transform", async ({ page }) => {
    await page.goto("/tools");
    await expect(page.getByText("TOML Converter")).toBeVisible();
  });
});
