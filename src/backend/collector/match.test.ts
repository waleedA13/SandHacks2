import { describe, expect, it } from "vitest";
import { isSamePerson } from "./match";

const listing = {
  name: "Jane Doe, LMFT",
  phone: "(619) 555-0101",
  city: "San Diego",
  nameIsUnique: true,
};
const samePhone = "619-555-0101";
const otherPhone = "858-555-0199";
const inCity = "Office at 100 Main St, San Diego, CA 92101";
const elsewhere = "Office at 100 Main St, Fresno, CA 93701";

describe("isSamePerson", () => {
  it("matches same name and same phone", () => {
    const page = {
      names: ["Dr. Jane Doe"],
      phones: [samePhone],
      text: elsewhere,
    };
    expect(isSamePerson(listing, page)).toBe(true);
  });

  it("matches same name, different phone, city in text", () => {
    const page = { names: ["Jane Doe"], phones: [otherPhone], text: inCity };
    expect(isSamePerson(listing, page)).toBe(true);
  });

  it("rejects same name, different phone, city absent", () => {
    const page = { names: ["Jane Doe"], phones: [otherPhone], text: elsewhere };
    expect(isSamePerson(listing, page)).toBe(false);
  });

  it("rejects different name, same phone", () => {
    const page = { names: ["John Smith"], phones: [samePhone], text: inCity };
    expect(isSamePerson(listing, page)).toBe(false);
  });

  it("matches when listing phone is null, name matches, city in text", () => {
    const page = { names: ["Jane Doe"], phones: [otherPhone], text: inCity };
    expect(isSamePerson({ ...listing, phone: null }, page)).toBe(true);
  });

  it("rejects a shared name with different phone even when city is in text", () => {
    const page = { names: ["Jane Doe"], phones: [otherPhone], text: inCity };
    expect(isSamePerson({ ...listing, nameIsUnique: false }, page)).toBe(false);
  });

  it("matches a shared name on same phone", () => {
    const page = { names: ["Jane Doe"], phones: [samePhone], text: elsewhere };
    expect(isSamePerson({ ...listing, nameIsUnique: false }, page)).toBe(true);
  });

  it("ignores a middle initial the page leaves out", () => {
    const page = { names: ["Jane Doe"], phones: [samePhone], text: elsewhere };
    expect(isSamePerson({ ...listing, name: "Jane Q Doe" }, page)).toBe(true);
  });

  it("rejects a shared name when listing phone is null", () => {
    const page = { names: ["Jane Doe"], phones: [samePhone], text: inCity };
    expect(
      isSamePerson({ ...listing, nameIsUnique: false, phone: null }, page),
    ).toBe(false);
  });
});
