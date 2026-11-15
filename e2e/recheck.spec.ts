import { expect, test, type Page } from "@playwright/test";

// No worker runs in CI, so a job stays queued: these tests cover the press, not the result.
const ID = "00000000-0000-4000-8000-000000000003";
const LISTING = `/listing/${ID}`;

// Every recheck POST the page sends, with the job id it got back.
function jobIds(page: Page) {
  const ids: string[] = [];
  page.on("response", async (res) => {
    if (res.request().method() === "POST" && res.url().endsWith("/recheck"))
      ids.push(((await res.json()) as { jobId: string }).jobId);
  });
  return ids;
}

test("pressing Check again now starts one check and says so", async ({
  page,
}) => {
  const ids = jobIds(page);
  await page.goto(LISTING);
  const why = page.getByRole("region", { name: "Why it ranks here" });
  const reason = await why.locator(".reason").textContent();

  await why.getByRole("button", { name: "Check again now" }).click();

  await expect(why.getByRole("status")).toHaveText(
    "Checking now. This takes about a minute.",
  );
  // The old result stays while the check runs.
  await expect(why.locator(".reason")).toHaveText(reason ?? "");
  await expect.poll(() => ids.length).toBe(1);
  expect((await page.request.get(`/api/jobs/${ids[0]}`)).ok()).toBe(true);
});

test("a quick double press still makes one job", async ({ page }) => {
  const ids = jobIds(page);
  await page.goto(LISTING);
  const button = page.getByRole("button", { name: "Check again now" });
  await button.dblclick();

  await expect(button).toHaveAttribute("aria-disabled", "true");
  await expect.poll(() => ids.length).toBe(1);
  // Even a second POST (another tab, say) gets the same queued job back.
  const again = await page.request.post(`/api/listings/${ID}/recheck`);
  expect(((await again.json()) as { jobId: string }).jobId).toBe(ids[0]);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the button is hidden", async ({ page }) => {
    await page.goto(LISTING);
    await expect(page.locator(".recheck")).toBeHidden();
  });
});
