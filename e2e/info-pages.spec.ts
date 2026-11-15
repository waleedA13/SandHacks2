import { expect, test } from "@playwright/test";

const LAWYER =
  "Written by the TheraCheck team for a hackathon. Not reviewed by a lawyer.";

const PAGES = [
  {
    path: "/how-it-works",
    h1: "How it works",
    sections: [
      "Where the list comes from",
      "What we check",
      "How we read the pages",
      "The score",
      "“Pay yourself”",
      "Phone calls beat web pages",
      "Three ways to book",
      "What we can't promise",
    ],
  },
  {
    path: "/privacy",
    h1: "Privacy",
    sections: [
      "What we never collect",
      "What we keep",
      "What stays on your device",
      "What other services see",
      "Services we use",
      "Questions",
    ],
  },
  {
    path: "/terms",
    h1: "Terms",
    sections: [
      "If you need help now",
      "What TheraCheck shows",
      "Phone calls",
      "No guarantee",
    ],
  },
  {
    path: "/accessibility",
    h1: "Accessibility",
    sections: [
      "Our target",
      "What we checked",
      "What we haven't tested",
      "Report a problem",
    ],
  },
];

for (const { path, h1, sections } of PAGES) {
  test.describe(path, () => {
    test("has one h1, its sections and a way back to search", async ({
      page,
    }) => {
      await page.goto(path);
      const main = page.locator("main#main");
      await expect(main.getByRole("heading", { level: 1 })).toHaveText(h1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(main.getByRole("heading", { level: 2 })).toHaveText(
        sections,
      );
      await expect(
        main.getByRole("link", { name: "Back to search" }),
      ).toHaveAttribute("href", "/");
      await expect(page.getByText("This page is being written.")).toHaveCount(
        0,
      );
    });

    test("can be indexed", async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    });
  });
}

for (const path of ["/privacy", "/terms"])
  test(`${path} says it was not reviewed by a lawyer`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByText(LAWYER, { exact: true })).toBeVisible();
  });

test("/terms gives the 988 and 911 lines", async ({ page }) => {
  await page.goto("/terms");
  const main = page.locator("main#main");
  await expect(main.getByText("In a crisis, call or text 988.")).toBeVisible();
  await expect(main.getByText("In an emergency, call 911.")).toBeVisible();
  await expect(main.getByRole("link", { name: "988" })).toHaveAttribute(
    "href",
    "tel:988",
  );
  await expect(main.getByRole("link", { name: "911" })).toHaveAttribute(
    "href",
    "tel:911",
  );
});

test("/how-it-works gives the scores from score.ts", async ({ page }) => {
  await page.goto("/how-it-works");
  const main = page.locator("main#main");
  for (const line of [
    "Still seeing patients here: yes +20, no −30",
    "Takes this insurance: yes +15, no −25",
    "Taking new patients: yes +15, no −25",
    "70 or more: Likely available",
    "40 to 69: Unclear",
    "Under 40: Likely dead end",
  ])
    await expect(main.getByText(line, { exact: true })).toBeVisible();
});
