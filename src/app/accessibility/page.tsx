import type { Metadata } from "next";
import { Placeholder } from "@/frontend/Placeholder";

export const metadata: Metadata = {
  title: "Accessibility",
  robots: { index: false },
};

export default function Accessibility() {
  return <Placeholder title="Accessibility" />;
}
