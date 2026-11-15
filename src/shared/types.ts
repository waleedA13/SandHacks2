export type Tri = "yes" | "no" | "unknown";

export type Label =
  | "Likely available"
  | "Unclear"
  | "Likely dead end"
  | "Demo call: available"
  | "Demo call: unavailable"
  | "Pay yourself"
  | "Caller reported: available"
  | "Caller reported: unavailable";

export type PhoneLineType = "landline" | "mobile" | "voip" | "unknown";

export type BookingSource =
  "zocdoc" | "headway" | "alma" | "rula" | "practice_site";

export type EvidenceSource =
  "psychology_today" | "practice_site" | "zocdoc" | "headway" | "license_board";

export type LicenseStatus = "active" | "inactive" | "not_found" | "unchecked";

export type Listing = {
  id: string;
  insurer: string;
  plan: string;
  city: string;
  state: string;
  name: string;
  credential: string | null;
  address: string | null;
  phone: string | null;
  npi: string | null;
  sourceUrl: string;
  scrapedAt: string;
  bookingUrl: string | null;
  bookingSource: BookingSource | null;
  phoneLineType: PhoneLineType;
};

export type Evidence = {
  id: string;
  listingId: string;
  source: EvidenceSource;
  url: string;
  rawText: string;
  fetchedAt: string;
};

export type Verdict = {
  listingId: string;
  stillPractising: Tri;
  listsInsurer: Tri;
  acceptingNew: Tri;
  score: number;
  reason: string;
  checkedAt: string;
  specialties: string[];
  languages: string[];
  telehealth: Tri;
  selfPayMin: number | null;
  selfPayMax: number | null;
  licenseStatus: LicenseStatus;
  licenseDiscipline: Tri;
  seesSelfPay: Tri;
};

export type Call = {
  id: string;
  listingId: string;
  status: "in_progress" | "done" | "failed";
  takesPlan: Tri | null;
  acceptingNew: Tri | null;
  summary: string | null;
  calledAt: string;
  source: "agent" | "caller";
};

export type Job = {
  id: string;
  listingId: string;
  kind: "recheck";
  status: "queued" | "running" | "done" | "failed";
  createdAt: string;
  finishedAt: string | null;
};

export type ListingSummary = {
  id: string;
  name: string;
  credential: string | null;
  address: string | null;
  phone: string | null;
  score: number;
  label: Label;
  reason: string;
  checkedAt: string;
  specialties: string[];
  languages: string[];
  telehealth: Tri;
  selfPayMin: number | null;
  selfPayMax: number | null;
  licenseStatus: LicenseStatus;
  bookingUrl: string | null;
  bookingSource: BookingSource | null;
  phoneLineType: PhoneLineType;
  plan: string;
  seesSelfPay: Tri;
  // Distinct evidence sources checked, plus 1 for the insurer directory.
  sourceCount: number;
  call: {
    takesPlan: Tri | null;
    acceptingNew: Tri | null;
    summary: string | null;
    calledAt: string;
  } | null;
};
