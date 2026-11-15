import { afterEach, expect, it, vi } from "vitest";
import { recordReport } from "@/backend/queries";
import { sendReport } from "./actions";

vi.mock("@/backend/queries", async (real) => ({
  isUuid: (await real<typeof import("@/backend/queries")>()).isUuid,
  recordReport: vi.fn(),
}));
// The real module opens a database client on import.
vi.mock("@/backend/db/client", () => ({ sql: vi.fn() }));

afterEach(() => vi.mocked(recordReport).mockReset());

const form = (answered: string, acceptingNew?: string) => {
  const f = new FormData();
  f.set("answered", answered);
  if (acceptingNew) f.set("acceptingNew", acceptingNew);
  return f;
};

it("rejects a tampered listing id without touching the database", async () => {
  expect(await sendReport("../../etc", null, form("yes", "yes"))).toBe("error");
  expect(recordReport).not.toHaveBeenCalled();
});

it("records a valid report", async () => {
  vi.mocked(recordReport).mockResolvedValue({ score: 0, label: "Unclear" });
  const id = "00000000-0000-4000-8000-000000000006";
  expect(await sendReport(id, null, form("yes"))).toBe("sent");
  expect(recordReport).toHaveBeenCalledWith(id, "yes", "unknown");
});
