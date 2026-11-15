import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Figtree, Nunito } from "next/font/google";
import { Footer } from "@/frontend/Footer";
import { Header } from "@/frontend/Header";
import "./globals.css";

const body = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-body",
  // next/font has no fallback metrics for this family yet.
  adjustFontFallback: false,
});
const head = Nunito({
  subsets: ["latin"],
  weight: "800",
  variable: "--font-head",
});
const ui = Figtree({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-ui",
});

export const metadata: Metadata = {
  title: { default: "TheraCheck", template: "%s | TheraCheck" },
  description:
    "Find therapists in your insurance directory who are likely to answer and take new patients.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className={`${body.variable} ${head.variable} ${ui.variable}`}>
        <div className="page">
          <a className="skip" href="#main">
            Skip to main content
          </a>
          <Header />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
