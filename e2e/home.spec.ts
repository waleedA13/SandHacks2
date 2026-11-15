import { expect, test } from "@playwright/test";

test("home page renders without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "TheraCheck" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", /.+/);
  expect(errors).toEqual([]);
});
