import { describe, expect, it } from "vitest";
import { bestBooking, findBooking } from "./booking";

describe("bestBooking", () => {
  it("picks the first source in the table order across pages", () => {
    const site = {
      url: "https://a.com/book",
      source: "practice_site" as const,
    };
    const zocdoc = {
      url: "https://zocdoc.com/doctor/x",
      source: "zocdoc" as const,
    };
    expect(bestBooking([null, site, zocdoc])).toEqual(zocdoc);
    expect(bestBooking([null])).toBeNull();
  });
});

const site = "https://janedoetherapy.com/about";
const page = (body: string) => `<html><body>${body}</body></html>`;

describe("findBooking", () => {
  it("takes a Zocdoc profile URL as the booking link", () => {
    const url = "https://www.zocdoc.com/doctor/jane-doe-lmft-12345";
    expect(findBooking("zocdoc", url, page(""))).toEqual({
      url,
      source: "zocdoc",
    });
  });

  it("takes a Headway profile URL as the booking link", () => {
    const url = "https://headway.co/providers/jane-doe";
    expect(findBooking("headway", url, page(""))).toEqual({
      url,
      source: "headway",
    });
  });

  it("finds an Alma profile linked from the practice site", () => {
    const html = page(
      `<a href="https://secure.helloalma.com/providers/jane-doe/">Find me on Alma</a>`,
    );
    expect(findBooking("practice_site", site, html)).toEqual({
      url: "https://secure.helloalma.com/providers/jane-doe/",
      source: "alma",
    });
  });

  it("finds a Rula profile linked from the practice site", () => {
    const html = page(
      `<a class="btn" href="https://www.rula.com/therapists/jane-doe/">Rula</a>`,
    );
    expect(findBooking("practice_site", site, html)).toEqual({
      url: "https://www.rula.com/therapists/jane-doe/",
      source: "rula",
    });
  });

  it("finds a practice booking system link on the practice site", () => {
    const html = page(
      `<a href="https://janedoe.clientsecure.me">Client portal</a>`,
    );
    expect(findBooking("practice_site", site, html)).toEqual({
      url: "https://janedoe.clientsecure.me/",
      source: "practice_site",
    });
  });

  // A "Schedule" link often leads to a contact page, which is not online booking.
  it("ignores a link labelled Schedule that is not a booking system", () => {
    const html = page(
      `<a href="/contact"><span>Schedule an appointment</span></a>`,
    );
    expect(findBooking("practice_site", site, html)).toBeNull();
  });

  it("finds a booking system link given relative to the page", () => {
    const html = page(`<a href="//janedoe.janeapp.com/">Book</a>`);
    expect(findBooking("practice_site", site, html)?.url).toBe(
      "https://janedoe.janeapp.com/",
    );
  });

  it("prefers a profile link over a booking system link", () => {
    const html = page(
      `<a href="https://x.intakeq.com/booking">Book</a><a href="https://www.rula.com/therapists/jane-doe">Rula</a>`,
    );
    expect(findBooking("practice_site", site, html)?.source).toBe("rula");
  });

  it("returns null for a page with no booking link", () => {
    const html = page(
      `<a href="https://facebook.com/janedoe">Facebook</a><a href="mailto:j@x.com">Book a call by email</a><a href="/books">Books I recommend</a>`,
    );
    expect(findBooking("practice_site", site, html)).toBeNull();
  });

  it("ignores links on a Psychology Today page", () => {
    const html = page(`<a href="https://janedoe.clientsecure.me">Book</a>`);
    expect(
      findBooking(
        "psychology_today",
        "https://www.psychologytoday.com/us/therapists/jane-doe/123",
        html,
      ),
    ).toBeNull();
  });
});
