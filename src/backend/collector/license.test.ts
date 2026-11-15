import { describe, expect, it } from "vitest";
import {
  licenseText,
  pickByLicenceNumber,
  pickLicenseRecord,
  profileLicenceNumbers,
} from "./license";

const listing = { name: "Jane Doe", credential: "LMFT", city: "San Diego" };
const record = {
  name: "Jane Doe",
  type: "Licensed Marriage and Family Therapist",
  city: "SAN DIEGO",
  county: "SAN DIEGO",
  url: "https://search.dca.ca.gov/",
};

describe("pickLicenseRecord", () => {
  it("returns the one result with same name, type and city", () => {
    expect(pickLicenseRecord(listing, [record])).toBe(record);
  });

  it("accepts a same-county address in another city", () => {
    const laJolla = { ...record, city: "LA JOLLA" };
    expect(pickLicenseRecord(listing, [laJolla])).toBe(laJolla);
  });

  it("rejects two results with the same name and type", () => {
    expect(pickLicenseRecord(listing, [record, { ...record }])).toBeNull();
  });

  it("accepts a dual-licensed therapist with one record per type", () => {
    const lpcc = {
      ...record,
      type: "Licensed Professional Clinical Counselor",
    };
    expect(
      pickLicenseRecord({ ...listing, credential: "LPCC, LMFT" }, [
        record,
        lpcc,
      ]),
    ).toBe(lpcc);
  });

  it("rejects a different city and county", () => {
    const fresno = { ...record, city: "FRESNO", county: "FRESNO" };
    expect(pickLicenseRecord(listing, [fresno])).toBeNull();
  });

  it("rejects a different licence type", () => {
    const lcsw = { ...record, type: "Licensed Clinical Social Worker" };
    expect(pickLicenseRecord(listing, [lcsw])).toBeNull();
  });

  it("rejects a listing with no credential", () => {
    expect(
      pickLicenseRecord({ ...listing, credential: null }, [record]),
    ).toBeNull();
  });

  it("rejects no results", () => {
    expect(pickLicenseRecord(listing, [])).toBeNull();
  });
});

describe("licenseText", () => {
  const row =
    "200\tCalifornia Board of Behavioral Sciences\t2001\tLicensed Marriage and Family Therapist\t12345\tI\tDOE\tJANE\tA\t\t1 Main St\t\tSAN DIEGO\tSAN DIEGO\tCA\t92101\tUnited States\t01-02-2010\t08-31-2027\tCurrentInactive";

  it("states the status, licence number and that discipline is not included", () => {
    const text = licenseText(row.split("\t"));
    expect(text).toContain("Licensed Marriage and Family Therapist 12345");
    expect(text).toContain("CurrentInactive (inactive)");
    expect(text).toContain("does not include disciplinary actions");
  });
});

describe("pickByLicenceNumber", () => {
  const lmft = { ...record, name: "JANE DOE", city: "FRESNO", number: "50208" };
  const lpcc = {
    ...lmft,
    type: "Licensed Professional Clinical Counselor",
    number: "1234",
  };
  const dual = { ...listing, credential: "LMFT, LPCC" };

  it("returns the record with that number, type and name, wherever it is", () => {
    expect(pickByLicenceNumber(listing, ["50208"], [lmft])).toBe(lmft);
  });

  it("ignores middle initials in the listing name", () => {
    const named = { ...listing, name: "Jane Q Doe" };
    expect(pickByLicenceNumber(named, ["50208"], [lmft])).toBe(lmft);
  });

  it("rejects the number under a different licence type", () => {
    const lcsw = { ...lmft, type: "Licensed Clinical Social Worker" };
    expect(pickByLicenceNumber(listing, ["50208"], [lcsw])).toBeNull();
  });

  it("rejects the number under a different last name", () => {
    const other = { ...lmft, name: "JANE ROE" };
    expect(pickByLicenceNumber(listing, ["50208"], [other])).toBeNull();
  });

  it("rejects a number that is not in the file", () => {
    expect(pickByLicenceNumber(listing, ["99999"], [lmft])).toBeNull();
  });

  it("rejects two numbers that point at two same-type licensees", () => {
    const twin = { ...lmft, number: "60000" };
    expect(
      pickByLicenceNumber(listing, ["50208", "60000"], [lmft, twin]),
    ).toBeNull();
  });

  it("accepts one record per type for a dual-licensed therapist", () => {
    expect(pickByLicenceNumber(dual, ["1234", "50208"], [lmft, lpcc])).toBe(
      lmft,
    );
  });
});

describe("profileLicenceNumbers", () => {
  it("reads the number after the state, with or without a type", () => {
    expect(
      profileLicenceNumbers(
        "Verified by Psychology Today Licensed by State of California / LMFT 37318 Beth",
      ),
    ).toEqual(["37318"]);
    expect(
      profileLicenceNumbers("Licensed by State of California / 96724 Diandra"),
    ).toEqual(["96724"]);
  });

  it("ignores other states", () => {
    expect(
      profileLicenceNumbers("Licensed by State of Oregon / 1234 Jane"),
    ).toEqual([]);
  });
});
