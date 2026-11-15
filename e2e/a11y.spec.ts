import { expect, test } from "@playwright/test";

// A landline listing: only landlines offer the assistant call panel (mobiles never do, #48).
const WITH_CALL = "/listing/00000000-0000-4000-8000-000000000002";

test("the first Tab reaches a skip link that jumps to the main content", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await expect(skip).toHaveAttribute("href", "#main");
  await expect(page.locator("main#main")).toHaveCount(1);
});

test("text follows the browser's font size", async ({ page }) => {
  await page.goto("/");
  await page.addStyleTag({ content: "html { font-size: 32px; }" });
  const size = await page.evaluate(
    () => getComputedStyle(document.body).fontSize,
  );
  expect(size).toBe("36px");
});

test.describe("with JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  test("search still works", async ({ page }) => {
    await page.goto("/?insurer=Aetna&city=San+Diego");
    await expect(page.locator("main article")).toHaveCount(12);
  });

  test("the call panel says it needs JavaScript", async ({ page }) => {
    await page.goto(WITH_CALL);
    // getByText skips everything inside <noscript>, so find the message by its class.
    const message = page.locator(".no-js");
    await expect(message).toBeVisible();
    await expect(message).toContainText("The demo call needs JavaScript");
    await expect(message).toContainText(
      "You can still phone the office yourself.",
    );
    await expect(
      page.getByRole("button", { name: "Start demo call" }),
    ).toBeHidden();
  });
});

test("the search form uses plain labels", async ({ page }) => {
  await page.goto("/?insurer=Aetna&city=Fresno");
  await expect(page.getByLabel("Insurance company")).toHaveAttribute(
    "name",
    "insurer",
  );
});
