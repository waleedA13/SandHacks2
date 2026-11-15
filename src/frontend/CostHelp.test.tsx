// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { CostHelp } from "./CostHelp";

afterEach(cleanup);

it("shows the posted price and no other dollar amount", () => {
  const { container } = render(
    <CostHelp
      insurer="Aetna"
      name="Drew Fakename"
      price="$175 to $225 a session"
    />,
  );
  expect(
    screen.getByRole("heading", { name: "What it might cost" }),
  ).toBeTruthy();
  expect(
    screen.getByText("Their posted price: $175 to $225 a session"),
  ).toBeTruthy();
  expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
    "Is Drew Fakename in network for my plan?",
    "What's my copay for therapy?",
    "How much of my deductible is left?",
  ]);
  expect(container.textContent?.match(/\$\d+/g)).toEqual(["$175", "$225"]);
});

it("says no price is posted and shows no dollar amount", () => {
  const { container } = render(
    <CostHelp insurer="Cigna" name="Jordan Placeholder" price={null} />,
  );
  expect(screen.getByText("No price posted")).toBeTruthy();
  expect(
    screen.getByText("Ask Cigna (the number is on your card):"),
  ).toBeTruthy();
  expect(container.textContent).not.toMatch(/\$\d/);
});
