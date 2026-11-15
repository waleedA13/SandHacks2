import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TheraCheck",
  description: "Find therapists in your insurance directory who are likely to answer and take new patients.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
