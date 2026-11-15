import { expect, test, type Page } from "@playwright/test";

// Seed facts from src/backend/db/seed.sql:
// 8 Drew Fakename is the one "Pay yourself" listing, posted price $175 to $225.
// Every listing's plan is "Aetna Open Access". 2 Jordan Placeholder has no price.
// Sources: 8 has 2 evidence sources (+1 directory = 3), 6 has none (1).
const SD = "/?insurer=Aetna&city=San+Diego";
const listing = (n: number) =>
  `/listing/00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;

const section = (page: Page, name: string) =>
  page.locator("section", { has: page.getByRole("heading", { name }) });
const card = (page: Page, name: string) =>
  page.locator("article", { has: page.getByRole("heading", { name }) });

test("Pay yourself listings get their own section above the dead ends", async ({
  page,
}) => {
  await page.goto(SD);
  const pay = section(page, "If you can pay yourself");
  await expect(
    pay.getByText(
      "These therapists don't seem to take Aetna now, but they see clients who pay for themselves.",
    ),
  ).toBeVisible();
  await expect(pay.locator("article")).toHaveCount(1);
  await expect(
    pay.getByRole("heading", { name: /Drew Fakename/ }),
  ).toBeVisible();
  await expect(pay.getByText("Pay yourself", { exact: true })).toBeVisible();
  await expect(pay.locator(".price")).toHaveText(
    "Their posted price: $175 to $225 a session",
  );

  await expect(
    section(page, "Likely dead end").getByRole("heading", {
      name: /Drew Fakename/,
    }),
  ).toHaveCount(0);
  await expect(
    section(page, "Also worth a try").getByRole("heading", {
      name: /Drew Fakename/,
    }),
  ).toHaveCount(0);

  // The order on the page: Also worth a try, then this, then Likely dead end.
  const headings = await page
    .getByRole("heading", { level: 2 })
    .allInnerTexts();
  const at = (h: string) => headings.indexOf(h);
  expect(at("Also worth a try")).toBeLessThan(at("If you can pay yourself"));
  expect(at("If you can pay yourself")).toBeLessThan(at("Likely dead end"));
});

test("the results say which plan we checked and where to find yours", async ({
  page,
}) => {
  await page.goto(SD);
  // The plan already names the insurer, so it is not "Aetna Aetna Open Access".
  await expect(
    page.getByText("Checked against Aetna Open Access", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Your plan name is on your insurance card. If it says something else, these results may not apply.",
    ),
  ).toBeVisible();
});

test("cards say how many places we checked", async ({ page }) => {
  await page.goto(SD);
  await expect(
    card(page, "Drew Fakename").locator(".sources-count"),
  ).toHaveText("Checked in 3 places");
  await expect(card(page, "Quinn Sample").locator(".sources-count")).toHaveText(
    "Checked in 1 place",
  );
});

test("the detail page explains costs with only the posted price", async ({
  page,
}) => {
  await page.goto(listing(8));
  const cost = section(page, "What it might cost");
  await expect(
    cost.getByText("Their posted price: $175 to $225 a session"),
  ).toBeVisible();
  await expect(
    cost.getByText(
      "With Aetna: if they're in your network, you usually pay a copay or part of the fee after your deductible. If they're not, you may pay the full fee and claim some back.",
    ),
  ).toBeVisible();
  await expect(
    cost.getByText("Ask Aetna (the number is on your card):"),
  ).toBeVisible();
  await expect(cost.getByRole("listitem")).toHaveText([
    "Is Drew Fakename in network for my plan?",
    "What's my copay for therapy?",
    "How much of my deductible is left?",
  ]);
  await expect(
    cost.getByText(
      "Paying yourself? You have the right to a written Good Faith Estimate of the cost before your first session.",
    ),
  ).toBeVisible();

  // No dollar amounts anywhere on the page except the therapist's own.
  const main = await page.locator("main").innerText();
  expect(main.match(/\$\d+/g)).toEqual(["$175", "$225"]);
});

test("every detail page has the cost panel, with no price when none is posted", async ({
  page,
}) => {
  await page.goto(listing(2));
  const cost = section(page, "What it might cost");
  await expect(cost).toBeVisible();
  await expect(cost.getByText("No price posted")).toBeVisible();
  await expect(cost.getByText(/Their posted price/)).toHaveCount(0);
  expect(await page.locator("main").innerText()).not.toMatch(/\$\d/);
});

test("listing 8 gets the self-pay questions, not the insurer ones", async ({
  page,
}) => {
  await page.goto(SD);
  const script = card(page, "Drew Fakename").locator(".script");
  await script.locator("summary").click();
  await expect(script.getByRole("listitem")).toHaveText([
    "\u201cDo you have openings for clients who pay for themselves?\u201d",
    "\u201cWhat do you charge per session?\u201d",
  ]);
  // Other labels keep the insurer questions.
  await expect(
    card(page, "Avery Example").locator(".script li").first(),
  ).toHaveText("\u201cDo you take Aetna?\u201d");

  await page.goto(listing(8));
  const say = page.locator("#call-yourself .say");
  await expect(say).toContainText(
    "Do you have openings for clients who pay for themselves?",
  );
  await expect(say).toContainText("What do you charge per session?");
  await expect(say).not.toContainText("Do you take");
});

test.describe("with JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  test("the section and the cost panel are in the HTML", async ({ page }) => {
    await page.goto(SD);
    await expect(
      section(page, "If you can pay yourself").getByRole("heading", {
        name: /Drew Fakename/,
      }),
    ).toBeVisible();
    await page.goto(listing(8));
    await expect(
      page.getByRole("heading", { name: "What it might cost" }),
    ).toBeVisible();
  });
});
