import type { BookingSource, EvidenceSource } from "@/shared/types";

export type Booking = { url: string; source: BookingSource };

const PROFILES: [RegExp, RegExp, BookingSource][] = [
  [/(^|\.)zocdoc\.com$/, /^\/doctor\//, "zocdoc"],
  [/(^|\.)headway\.co$/, /^\/providers\//, "headway"],
  [/(^|\.)helloalma\.com$/, /^\/providers\//, "alma"],
  [/(^|\.)rula\.com$/, /^\/therapists\//, "rula"],
];
// SimplePractice clients book on clientsecure.me; TherapyNotes on therapyportal.com.
const BOOKING_HOSTS =
  /(^|\.)(simplepractice\.com|clientsecure\.me|therapynotes\.com|therapyportal\.com|janeapp\.com|intakeq\.com|therapyappointment\.com)$/;

const profileSource = (url: string) => {
  try {
    const { hostname, pathname } = new URL(url);
    return (
      PROFILES.find(([h, p]) => h.test(hostname) && p.test(pathname))?.[2] ??
      null
    );
  } catch {
    return null;
  }
};

/** A booking link on one page that already passed the identity check, or null. Stores the URL only; never opens it. */
export function findBooking(
  pageSource: EvidenceSource,
  pageUrl: string,
  html: string,
): Booking | null {
  if (pageSource === "zocdoc" || pageSource === "headway") {
    const source = profileSource(pageUrl);
    return source ? { url: pageUrl, source } : null;
  }
  if (pageSource !== "practice_site") return null;

  // Only links to a site where you can book online count; a "Schedule" link to a contact page does not.
  const links = [...html.matchAll(/<a\s[^>]*href\s*=\s*["']([^"']+)["']/gi)]
    .map(([, href]) => {
      try {
        return new URL(href, pageUrl);
      } catch {
        return null;
      }
    })
    .filter((u): u is URL => u?.protocol.startsWith("http") ?? false);

  for (const u of links) {
    const source = profileSource(u.href);
    if (source) return { url: u.href, source };
  }
  const link = links.find((u) => BOOKING_HOSTS.test(u.hostname));
  return link ? { url: link.href, source: "practice_site" } : null;
}

const RANK: BookingSource[] = [
  "zocdoc",
  "headway",
  "alma",
  "rula",
  "practice_site",
];

/** First match wins, in the issue's table order. */
export const bestBooking = (found: (Booking | null)[]) =>
  found
    .filter((b): b is Booking => b !== null)
    .sort((a, b) => RANK.indexOf(a.source) - RANK.indexOf(b.source))[0] ?? null;
