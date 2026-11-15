import { expect, test, type Page } from "@playwright/test";

// Seed paths (db/seed.sql): 1 has a Zocdoc booking link, 2 is a landline without one,
// 6 is a mobile. The report tests use 9 and 11, both already dead ends, and report
// "not taking new patients", so the counts and order other specs check stay the same.
const BOOK = "00000000-0000-4000-8000-000000000001";
const LANDLINE = "00000000-0000-4000-8000-000000000002";
const MOBILE = "00000000-0000-4000-8000-000000000006";
const REPORT = "00000000-0000-4000-8000-000000000009";
const NO_JS_REPORT = "00000000-0000-4000-8000-000000000011";

// Reports change shared data and are limited to one a minute, so run them once, not per device.
const desktopOnly = () =>
  test.skip(
    test.info().project.name !== "desktop-chromium",
    "reports write to the shared database",
  );

const card = (page: Page, id: string) =>
  page.locator(`article[aria-labelledby="listing-${id}"]`);

test("each card leads with its first booking path", async ({ page }) => {
  await page.goto("/?insurer=Aetna&city=San+Diego");

  const book = card(page, BOOK).locator(".actions .btn");
  await expect(book).toContainText("Book online");
  await expect(book).toHaveAttribute("href", "https://example.com/book/avery");
  await expect(book).toHaveAttribute("target", "_blank");
  await expect(book).toHaveAttribute("rel", "noopener noreferrer");

  const ask = card(page, LANDLINE).locator(".actions .btn");
  await expect(ask).toContainText("Ask the assistant to call");
  await expect(ask).toHaveAttribute(
    "href",
    new RegExp(`/listing/${LANDLINE}\\?.*#assistant$`),
  );

  const call = card(page, MOBILE).locator(".actions .btn");
  await expect(call).toContainText("Call (619) 555-0106");
  await expect(call).toHaveAttribute("href", "tel:+16195550106");
  // A mobile number never offers the assistant.
  await expect(card(page, MOBILE)).not.toContainText("Ask the assistant");
});

test("the detail page shows the paths in order", async ({ page }) => {
  await page.goto(`/listing/${BOOK}`);
  const panel = page.getByRole("region", { name: "How to book" });
  await expect(panel.getByRole("heading", { level: 3 })).toHaveText([
    "Book online",
    "Ask the assistant",
    "Call yourself",
  ]);
  await expect(
    panel.getByRole("link", { name: /Book online with Zocdoc/ }),
  ).toHaveAttribute("target", "_blank");
  await expect(
    panel.getByText("Check the booking says it takes Aetna Open Access."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Confirm by phone" }),
  ).toHaveCount(0);
});

test("a mobile listing has no voice widget", async ({ page }) => {
  await page.goto(`/listing/${MOBILE}`);
  const panel = page.getByRole("region", { name: "How to book" });
  await expect(panel.getByRole("heading", { level: 3 })).toHaveText([
    "Call yourself",
  ]);
  await expect(page.locator(".voice")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /demo call/i })).toHaveCount(0);
  await expect(
    panel.getByText("Is Quinn Sample taking new patients?", { exact: false }),
  ).toBeVisible();
});

test("a self-call report updates the badge without a reload", async ({
  page,
}) => {
  desktopOnly();
  await page.goto(`/listing/${REPORT}`);
  const form = page.locator("form.report");

  // The second question only shows after "Yes".
  await expect(
    form.getByRole("group", { name: "Are they taking new patients?" }),
  ).toBeHidden();
  await form
    .getByRole("group", { name: "Did they answer?" })
    .getByLabel("Yes")
    .check();
  await form
    .getByRole("group", { name: "Are they taking new patients?" })
    .getByLabel("No", { exact: true })
    .check();

  // A full reload would drop this marker.
  await page.evaluate(
    () => ((window as unknown as { kept: boolean }).kept = true),
  );
  await form.getByRole("button", { name: "Send" }).click();

  await expect(page.locator(".live-badge")).toContainText(
    "Caller reported: unavailable",
  );
  await expect(form.getByRole("status")).toContainText("Thanks");
  expect(
    await page.evaluate(() => (window as unknown as { kept?: boolean }).kept),
  ).toBe(true);

  // A second report inside 60 seconds is turned away.
  await form
    .getByRole("group", { name: "Did they answer?" })
    .getByLabel("No", { exact: true })
    .check();
  await form.getByRole("button", { name: "Send" }).click();
  await expect(form.getByRole("status")).toHaveText(
    "Thanks, we already have a report for this listing. Try again in a minute.",
  );
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the report form posts and the page reloads with the new label", async ({
    page,
  }) => {
    desktopOnly();
    await page.goto(`/listing/${NO_JS_REPORT}`);
    const form = page.locator("form.report");
    await form
      .getByRole("group", { name: "Did they answer?" })
      .getByLabel("Yes")
      .check();
    await form
      .getByRole("group", { name: "Are they taking new patients?" })
      .getByLabel("No", { exact: true })
      .check();
    await form.getByRole("button", { name: "Send" }).click();

    await expect(page.locator(".live-badge")).toContainText(
      "Caller reported: unavailable",
    );
  });
});

test("the booking panel has no sideways scroll at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ["/?insurer=Aetna&city=San+Diego", `/listing/${BOOK}`]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  }
});
