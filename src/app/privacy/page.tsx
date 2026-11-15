import type { Metadata } from "next";
import { Placeholder } from "@/frontend/Placeholder";

export const metadata: Metadata = {
  title: "Privacy",
  robots: { index: false },
};

export default function Privacy() {
  return <Placeholder title="Privacy" />;
}
