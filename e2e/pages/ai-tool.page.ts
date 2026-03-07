import { expect } from "@playwright/test";
import { DevToolPage } from "./dev-tool.page";

/**
 * Extended Page Object for AI tool pages.
 * Adds nav highlighting and redirect assertions.
 */
export class AIToolPage extends DevToolPage {
  /** Assert that a specific nav tab is highlighted (underlined). */
  async expectNavHighlight(tab: "Write" | "Code" | "Media" | "Protect") {
    const link = this.page.getByRole("link", { name: tab });
    await expect(link).toHaveCSS("text-decoration-line", "underline");
  }

  /** Assert the page URL hasn't redirected away from the expected path. */
  async expectNoRedirect(expectedPath: string) {
    await expect(this.page).toHaveURL(expectedPath);
  }
}
