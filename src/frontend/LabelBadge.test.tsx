// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { Label } from "@/shared/types";
import { LABELS, LabelBadge } from "./LabelBadge";

afterEach(cleanup);

const NEW: Label[] = [
  "Pay yourself",
  "Caller reported: available",
  "Caller reported: unavailable",
];

it.each(NEW)("renders the %s label with an icon", (label) => {
  const { container } = render(<LabelBadge label={label} />);
  expect(screen.getByText(label)).toBeTruthy();
  expect(container.querySelector("svg")).toBeTruthy();
  expect(LABELS).toContain(label);
});
