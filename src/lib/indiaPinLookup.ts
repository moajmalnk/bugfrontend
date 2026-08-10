/**
 * Why: Fill post office / district / state from India PIN so users don't retype
 * postal data that India Post already publishes. One PIN can map to several
 * offices — return the full list so the user can pick the correct branch.
 */

import { INDIAN_STATES, districtsForState } from "@/lib/indiaLocations";

export type IndiaPinOffice = {
  name: string;
  branchType: string;
  deliveryStatus: string;
};

export type IndiaPinLookup = {
  offices: IndiaPinOffice[];
  /** Suggested default (Sub Post Office preferred, else first Delivery). */
  suggestedOffice: string;
  district: string;
  state: string;
  city: string;
  country: string;
};

type PostalApiOffice = {
  Name?: string;
  District?: string;
  State?: string;
  Block?: string;
  Division?: string;
  Country?: string;
  DeliveryStatus?: string;
  BranchType?: string;
};

type PostalApiResponse = Array<{
  Status?: string;
  Message?: string;
  PostOffice?: PostalApiOffice[] | null;
}>;

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchState(apiState: string): string {
  const n = normalize(apiState);
  const hit = INDIAN_STATES.find((s) => normalize(s) === n);
  if (hit) return hit;
  if (n === "orissa") return "Odisha";
  if (n === "pondicherry") return "Puducherry";
  return apiState.trim();
}

function matchDistrict(state: string, apiDistrict: string): string {
  const districts = districtsForState(state);
  const n = normalize(apiDistrict).replace(/\(.*?\)/g, "").trim();
  const exact = districts.find((d) => normalize(d) === n);
  if (exact) return exact;
  const soft = districts.find(
    (d) => normalize(d).includes(n) || n.includes(normalize(d))
  );
  return soft || apiDistrict.trim();
}

function pickSuggested(offices: IndiaPinOffice[]): string {
  const sub = offices.find((o) => /sub post office/i.test(o.branchType));
  if (sub) return sub.name;
  const delivery = offices.find((o) => /delivery/i.test(o.deliveryStatus));
  return (delivery || offices[0])?.name || "";
}

/**
 * Lookup India PIN via public postal API. Returns null when not found / error.
 */
export async function lookupIndiaPin(
  pin: string,
  signal?: AbortSignal
): Promise<IndiaPinLookup | null> {
  const clean = pin.replace(/\D/g, "");
  if (clean.length !== 6) return null;

  const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as PostalApiResponse;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row || row.Status !== "Success" || !Array.isArray(row.PostOffice) || row.PostOffice.length === 0) {
    return null;
  }

  const offices: IndiaPinOffice[] = row.PostOffice.map((o) => ({
    name: (o.Name || "").trim(),
    branchType: (o.BranchType || "").trim(),
    deliveryStatus: (o.DeliveryStatus || "").trim(),
  })).filter((o) => o.name);

  if (offices.length === 0) return null;

  // Use first office for geo fields (same district/state for a PIN)
  const geoSource = row.PostOffice[0];
  const state = matchState(geoSource?.State || "");
  const district = matchDistrict(state, geoSource?.District || "");
  const city =
    (geoSource?.Block || geoSource?.Division || geoSource?.District || "").trim() ||
    district;

  return {
    offices,
    suggestedOffice: pickSuggested(offices),
    district: district.slice(0, 100),
    state: state.slice(0, 100),
    city: city.slice(0, 100),
    country: "India",
  };
}
