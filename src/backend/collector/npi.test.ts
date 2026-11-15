import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupNpi } from "./npi";

afterEach(() => vi.unstubAllGlobals());

describe("lookupNpi", () => {
  it("returns null when the registry answers with an error", async () => {
    vi.stubGlobal("fetch", async () => new Response("busy", { status: 503 }));
    expect(await lookupNpi("Ana", "Ruiz", "La Jolla", "CA")).toBeNull();
  });

  it("returns null when the registry cannot be reached", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    expect(await lookupNpi("Ana", "Ruiz", "La Jolla", "CA")).toBeNull();
  });
});
