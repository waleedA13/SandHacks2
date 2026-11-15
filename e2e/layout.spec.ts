import { expect, test } from "@playwright/test";

// Seed facts from src/backend/db/seed.sql: in Aetna, San Diego, 4 listings look reachable
// and 3 are "Unclear" (5, 6 and 7). Listing 1 has a booking link and sources.
const SD = "/?insurer=Aetna&city=San+Diego";
const DETAIL = "/listing/00000000-0000-4000-8000-000000000001";

test("the first top-3 card is on the first screen at 1280x800", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(SD);
  await expect(page.locator(".start article").first()).toBeInViewport();
});

test("the first card's name is on the first screen at 390x844", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(SD);
  await expect(page.locator(".start article h3").first()).toBeInViewport({
    ratio: 1,
  });
});

test("cards say the check date and the call script only once", async ({
  page,
}) => {
  await page.goto(SD);
  await expect(page.getByText(/^Checked [A-Z][a-z]{2} \d/)).toHaveCount(1);
  await expect(page.getByText("What to ask when they answer")).toHaveCount(0);
  await expect(page.getByText(/^Last checked/)).toHaveCount(0);
});

test.describe("with JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  test("the listings we couldn't confirm fold into one line that opens", async ({
    page,
  }) => {
    await page.goto(SD);
    const more = page.locator("details.more", {
      hasText: "listings we couldn't confirm",
    });
    await expect(more).not.toHaveAttribute("open");
    const summary = more.locator("summary");
    await expect(summary).toHaveText(
      "Show 3 more listings we couldn't confirm",
    );
    await expect(more.locator("article")).toHaveCount(3);
    await expect(more.locator("article").first()).toBeHidden();

    await summary.click();
    await expect(more.locator("article").first()).toBeVisible();
    // A compact row: badge, name, main action and details, no "no information" line.
    const quinn = more.locator("article", {
      has: page.getByRole("heading", { name: /Quinn Sample/ }),
    });
    await expect(quinn.getByRole("link", { name: /^Call/ })).toBeVisible();
    await expect(quinn).not.toContainText("We found no other information");
  });

  test("the filters are folded and open without JavaScript", async ({
    page,
  }) => {
    await page.goto(SD);
    const filters = page.getByLabel("What do you need help with?");
    await expect(filters).toBeHidden();
    await page.locator(".narrow summary").click();
    await expect(filters).toBeVisible();
  });
});

test("on a phone, How to book comes straight after the name", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(DETAIL);
  const name = await page.locator(".detail-top").boundingBox();
  const book = await page
    .getByRole("region", { name: "How to book" })
    .boundingBox();
  const why = await page
    .getByRole("region", { name: "Why it ranks here" })
    .boundingBox();
  expect(book!.y).toBeGreaterThan(name!.y + name!.height);
  expect(book!.y).toBeLessThan(why!.y);
  // The name card no longer repeats the phone button.
  await expect(page.locator(".detail-top a")).toHaveCount(0);
});

test("from 1024px, How to book is a sticky right column", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(DETAIL);
  const name = await page.locator(".detail-top").boundingBox();
  const book = await page
    .getByRole("region", { name: "How to book" })
    .boundingBox();
  expect(book!.x).toBeGreaterThan(name!.x + name!.width);
  await expect(page.locator(".detail-side")).toHaveCSS("position", "sticky");
});
