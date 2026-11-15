import { expect, test, type Page } from "@playwright/test";

const PAGES = [
  "/",
  "/privacy",
  "/terms",
  "/how-it-works",
  "/accessibility",
  "/listing/00000000-0000-4000-8000-000000000004",
  "/listing/not-a-real-id",
];

const HONEST = "Based on public web pages. Only the office can confirm.";

function shellLinks(page: Page) {
  return page.locator(".page > header a, .page > footer a");
}

for (const path of PAGES) {
  test.describe(path, () => {
    test("has one header, one footer and one honesty line", async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.getByRole("banner")).toHaveCount(1);
      await expect(page.getByRole("contentinfo")).toHaveCount(1);
      await expect(page.getByText(HONEST, { exact: true })).toHaveCount(1);
    });

    test("every header and footer link opens", async ({ page }) => {
      await page.goto(path);
      const hrefs = await shellLinks(page).evaluateAll((links) =>
        links.map((a) => a.getAttribute("href") ?? ""),
      );
      const internal = [...new Set(hrefs.filter((h) => h.startsWith("/")))];
      expect(internal.length).toBeGreaterThan(0);
      for (const href of internal) {
        const res = await page.request.get(href);
        expect(res.status(), href).toBe(200);
      }
      expect(hrefs).toContain("tel:988");
    });

    test("the first Tab focuses the skip link, and Enter jumps into main", async ({
      page,
    }) => {
      await page.goto(path);
      await page.keyboard.press("Tab");
      const skip = page.getByRole("link", { name: "Skip to main content" });
      await expect(skip).toBeFocused();
      await page.keyboard.press("Enter");
      await page.keyboard.press("Tab");
      const inMain = await page.evaluate(() =>
        Boolean(document.activeElement?.closest("main#main")),
      );
      expect(inMain).toBe(true);
    });

    test("fits the screen and shell links are easy to tap", async ({
      page,
    }) => {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow).toBe(false);
      for (const box of await shellLinks(page).evaluateAll((links) =>
        links.map((a) => a.getBoundingClientRect().height),
      ))
        expect(box).toBeGreaterThanOrEqual(44);
    });
  });
}

test.describe("with JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  test("the header and footer still render", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
    await page
      .getByRole("navigation", { name: "Footer" })
      .getByRole("link", { name: "Terms" })
      .click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Terms");
  });
});
