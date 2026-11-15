import type { Metadata } from "next";
import { Placeholder } from "@/frontend/Placeholder";

export const metadata: Metadata = {
  title: "Terms",
  robots: { index: false },
};

export default function Terms() {
  return <Placeholder title="Terms" />;
}
