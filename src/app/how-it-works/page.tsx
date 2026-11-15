import type { Metadata } from "next";
import { Placeholder } from "@/frontend/Placeholder";

export const metadata: Metadata = {
  title: "How it works",
  robots: { index: false },
};

export default function HowItWorks() {
  return <Placeholder title="How it works" />;
}
