// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SourceList } from "./SourceList";

afterEach(cleanup);

it("links https sources and drops the link for other schemes", () => {
  render(
    <SourceList
      evidence={[
        {
          source: "practice_site",
          url: "https://example.com/avery",
          fetchedAt: "2026-11-14T20:00:00.000Z",
          rawText: "Now accepting new clients.",
        },
        {
          source: "zocdoc",
          url: "javascript:alert(1)",
          fetchedAt: "2026-11-14T20:00:00.000Z",
          rawText: "Schedule full.",
        },
      ]}
    />,
  );

  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(1);
  expect(links[0].getAttribute("href")).toBe("https://example.com/avery");
  expect(screen.getByText("Zocdoc")).toBeTruthy();
  expect(screen.getByText("“Schedule full.”")).toBeTruthy();
});
