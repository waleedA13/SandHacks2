import { expect, test, type Page } from "@playwright/test";

// Seed ids from db/seed.sql: 1 has three evidence rows, 7 has none, 4 has a done call.
const WITH_EVIDENCE = "/listing/00000000-0000-4000-8000-000000000001";
const NO_EVIDENCE = "/listing/00000000-0000-4000-8000-000000000007";
const WITH_CALL = "/listing/00000000-0000-4000-8000-000000000004";

function trackConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
}

test("a listing with evidence shows facts and sources", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto(`${WITH_EVIDENCE}?insurer=Aetna&city=San+Diego`);

  await expect(
    page.getByRole("heading", { level: 1, name: "Avery Example, LMFT" }),
  ).toBeVisible();
  await expect(page.getByText("Likely available")).toBeVisible();
  await expect(page.locator(".fact")).toHaveCount(4);
  await expect(page.getByText("Still seeing patients here?")).toBeVisible();

  const links = page.locator(".source a");
  await expect(links).toHaveCount(3);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }

  await expect(
    page.getByRole("link", { name: "Back to results" }),
  ).toHaveAttribute("href", "/?insurer=Aetna&city=San+Diego");
  expect(errors).toEqual([]);
});

test("a listing with no evidence shows no empty sections", async ({ page }) => {
  await page.goto(NO_EVIDENCE);

  await expect(
    page.getByText("We found no other information about this listing."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What we found" }),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Sources" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Back to results" }),
  ).toHaveAttribute("href", "/");
});

test("an earlier demo call still shows on the listing", async ({ page }) => {
  await page.goto(WITH_CALL);
  await expect(page.getByText(/^Demo call on .+: the person/)).toBeVisible();
  await expect(page.getByText("Demo call: available")).toBeVisible();
});

test("an unknown listing shows a not-found page", async ({ page }) => {
  // The status stays 200: the page renders the not-found message itself.
  await page.goto("/listing/not-a-real-id");
  await expect(
    page.getByRole("heading", { name: "We couldn't find that listing." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Go to the search page" }),
  ).toBeVisible();
});

test("the detail page has no sideways scroll at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(WITH_EVIDENCE);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the results page links to details with the search kept", async ({
  page,
}) => {
  await page.goto("/?insurer=Aetna&city=San+Diego");
  await page
    .getByRole("link", { name: "View details for Avery Example" })
    .click();
  await expect(page).toHaveURL(
    /\/listing\/00000000-0000-4000-8000-000000000001\?insurer=Aetna&city=San\+Diego$/,
  );
});
