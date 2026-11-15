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
    page.getByText("We don't have listings for that insurer and place yet."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Show Aetna in San Diego" }).click();
  await expect(page).toHaveURL(/\/\?insurer=Aetna&city=San\+Diego$/);
  await expect(page.locator("main article")).toHaveCount(12);
  expect(errors).toEqual([]);
});

test("a ZIP code with no listings shows the empty state", async ({ page }) => {
  await page.goto("/?insurer=Aetna&city=90210");
  await expect(
    page.getByText("We don't have listings for that insurer and place yet."),
  ).toBeVisible();
  await expect(page.locator("main article")).toHaveCount(0);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("searching by ZIP code shows only that ZIP", async ({ page }) => {
    await page.goto("/?insurer=Aetna&city=Fresno");
    const box = page.getByLabel("City or ZIP code");
    await expect(box).toHaveAttribute("autocomplete", "address-level2");
    await box.fill("92103");
    await page.getByRole("button", { name: "Show therapists" }).click();

    await expect(page).toHaveURL(/\/\?insurer=Aetna&city=92103$/);
    await expect(page.locator("main article")).toHaveCount(1);
    await expect(
      page.getByText("Of 1 Aetna listing in 92103,", { exact: false }),
    ).toBeVisible();
    await expect(page.locator(".search-pill summary")).toContainText(
      "Aetna · 92103 · Change",
    );
  });

  test("searching by city name shows results", async ({ page }) => {
    await page.goto("/?insurer=Aetna&city=Fresno");
    await page.getByLabel("City or ZIP code").fill("san diego");
    await page.getByRole("button", { name: "Show therapists" }).click();
    await expect(page.locator("main article")).toHaveCount(12);
  });
});

test("Back from a listing returns to the same ZIP results", async ({
  page,
}) => {
  await page.goto("/?insurer=Aetna&city=92101");
  await expect(page.locator("main article")).toHaveCount(2);
  await expect(
    page.getByText("Of 2 Aetna listings in 92101,", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "View details for Avery Example" })
    .click();
  await expect(page).toHaveURL(/\?insurer=Aetna&city=92101$/);
  await page.getByRole("link", { name: "Back to results" }).click();
  await expect(page).toHaveURL(/\/\?insurer=Aetna&city=92101$/);
  await expect(page.locator("main article")).toHaveCount(2);
});

test("the city box is at least 44px tall with no sideways scroll at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/?insurer=Aetna&city=Fresno");
  const box = await page.getByLabel("City or ZIP code").boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("an insurer with no city starts in that insurer's first city", async ({
  page,
}) => {
  await page.goto("/?insurer=aetna");
  await expect(page.locator("main article")).toHaveCount(12);
});
