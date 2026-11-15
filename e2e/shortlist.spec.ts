import { expect, test } from "@playwright/test";

// Seed facts from src/backend/db/seed.sql:
// anxiety + video sessions: 1 Avery Example and 7 Taylor Mockwell.
// Fees: 1 is $150 to $180, 3 is $200, 2 has none.
// Licenses: 1 active, 10 not_found, 12 inactive.
const SD = "/?insurer=Aetna&city=San+Diego";
const listing = (n: number) =>
  `/listing/00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;

test("filters live in the URL and narrow the list", async ({ page }) => {
  await page.goto(`${SD}&specialty=anxiety&telehealth=yes`);

  await expect(page.locator("main article")).toHaveCount(2);
  await expect(page.getByText("Showing 2 of 12")).toBeVisible();
  await expect(page.getByLabel("What do you need help with?")).toHaveValue(
    "anxiety",
  );
  await expect(page.getByLabel("Video or phone sessions")).toBeChecked();
  // The summary still counts every listing for the insurer and city.
  await expect(
    page.getByText("4 of 12 Aetna listings in San Diego look reachable."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Clear filters" }),
  ).toHaveAttribute("href", "/?insurer=Aetna&city=San+Diego");
});

test("choosing a filter and submitting puts it in the URL", async ({
  page,
}) => {
  await page.goto(SD);
  // The filters start folded; a filter in the URL opens them (checked above).
  await page.locator(".narrow summary").click();
  await page.getByLabel("Language").selectOption("spanish");
  await page
    .locator(".filters")
    .getByRole("button", { name: "Show therapists" })
    .click();
  await expect(page).toHaveURL(/language=spanish/);
  await expect(page.locator("main article")).toHaveCount(2);
});

test("Back to results keeps the filters", async ({ page }) => {
  const filtered = `${SD}&specialty=anxiety&language=spanish&telehealth=yes`;
  await page.goto(filtered);
  await page
    .getByRole("link", { name: "View details for Avery Example" })
    .click();
  await expect(page).toHaveURL(
    `${listing(1)}?insurer=Aetna&city=San+Diego&specialty=anxiety&language=spanish&telehealth=yes`,
  );
  await page.getByRole("link", { name: "Back to results" }).click();
  await expect(page).toHaveURL(filtered);
  await expect(page.locator("main article")).toHaveCount(1);
});

test("filters with no matches say so", async ({ page }) => {
  await page.goto(`${SD}&specialty=teens&language=vietnamese`);
  await expect(
    page.getByText("No listings match all of these. Try removing one."),
  ).toBeVisible();
  await expect(page.locator("main article")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Clear filters" })).toBeVisible();
});

test("cards show the posted price only when there is one", async ({ page }) => {
  await page.goto(SD);
  const card = (name: string) =>
    page.locator("article", { has: page.getByRole("heading", { name }) });

  await expect(card("Avery Example").locator(".price")).toHaveText(
    "Their posted price: $150 to $180 a session",
  );
  await expect(card("Riley Fixture").locator(".price")).toHaveText(
    "Their posted price: $200 a session",
  );
  await expect(card("Jordan Placeholder").locator(".price")).toHaveCount(0);
});

test("the detail page explains the price, or says none is posted", async ({
  page,
}) => {
  await page.goto(listing(1));
  await expect(
    page.getByText("Their posted price: $150 to $180 a session"),
  ).toBeVisible();
  await expect(
    page.getByText(
      "This is the therapist's own price if you pay yourself. It is not what your insurance charges.",
    ),
  ).toBeVisible();

  await page.goto(listing(2));
  await expect(page.getByText("No price posted")).toBeVisible();
});

test("the license row uses neutral, plain wording", async ({ page }) => {
  await page.goto(listing(1));
  await expect(
    page.getByRole("link", { name: /California license: active/ }),
  ).toHaveAttribute("href", "https://example.com/board/avery");

  await page.goto(listing(12));
  await expect(page.getByText("California license: not active")).toBeVisible();

  await page.goto(listing(10));
  await expect(
    page.getByText("We could not match a license record."),
  ).toBeVisible();
  await expect(page.getByText(/unlicensed/i)).toHaveCount(0);
});

test.describe("sharing without a share sheet", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      delete (Navigator.prototype as { share?: unknown }).share;
    });
  });

  test("offers Copy and a text message with the top 3", async ({
    page,
    context,
    browserName,
  }) => {
    if (browserName === "chromium")
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`${SD}&telehealth=yes`);

    const sms = page.getByRole("link", { name: "Text it to me" });
    const body = decodeURIComponent(
      (await sms.getAttribute("href"))!.replace(/^sms:\?&body=/, ""),
    );
    const lines = body.split("\n");
    expect(lines[0]).toBe(
      "Therapists most likely to pick up (Aetna, San Diego)",
    );
    expect(lines).toHaveLength(5);
    expect(lines[1]).toBe("1. Avery Example: Likely available, (619) 555-0101");
    expect(lines[4]).toMatch(
      /\/\?insurer=Aetna&city=San\+Diego&telehealth=yes$/,
    );

    await page.getByRole("button", { name: "Copy" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Copied" }),
    ).toBeVisible();
  });
});

test.describe("with JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  test("filters work and sharing becomes a plain link", async ({ page }) => {
    await page.goto(`${SD}&specialty=anxiety`);
    await expect(page.locator("main article")).toHaveCount(2);

    // getByText skips everything inside <noscript>, so find the line by its class.
    const line = page.locator(".share-link");
    await expect(line).toBeVisible();
    await expect(line).toContainText("Share these results with this link:");
    await expect(line).toContainText(
      "/?insurer=Aetna&city=San+Diego&specialty=anxiety",
    );
    await expect(page.getByRole("button", { name: "Copy" })).toBeHidden();
  });
});
