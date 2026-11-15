import { expect, test, type Page } from "@playwright/test";

function trackConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
}

test("home page ranks the 12 Aetna listings in San Diego", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Find a therapist who will actually pick up.",
    }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", /.+/);
  await expect(page.locator("main article")).toHaveCount(12);
  await expect(page.getByText("Demo call: available")).toBeVisible();
  expect(errors).toEqual([]);
});

test("a city with no listings shows the empty state", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/?insurer=Aetna&city=Fresno");

  await expect(
    page.getByText(
      "We don't have listings for that insurer and city yet. Try Aetna in San Diego.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Show Aetna in San Diego" }),
  ).toBeVisible();
  await expect(page.locator("main article")).toHaveCount(0);
  expect(errors).toEqual([]);
});
