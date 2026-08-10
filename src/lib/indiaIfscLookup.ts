/**
 * Why: IFSC uniquely identifies an Indian bank branch. Looking it up lets users
 * skip retyping bank/branch details that RBI already publishes.
 */

export type IndiaIfscLookup = {
  ifsc: string;
  bank: string;
  branch: string;
  bankCode: string;
  address: string;
  city: string;
  state: string;
  /** True when the branch supports UPI (from public IFSC metadata). */
  upi: boolean;
};

type RazorpayIfscResponse = {
  IFSC?: string;
  BANK?: string;
  BRANCH?: string;
  BANKCODE?: string;
  ADDRESS?: string;
  CITY?: string;
  STATE?: string;
  UPI?: boolean;
};

/** Official IFSC shape: 4 letters + 0 + 6 alphanumeric (e.g. SBIN0001234). */
export function normalizeIfsc(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 11);
}

export function isValidIfscFormat(ifsc: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
}

/**
 * Lookup IFSC via Razorpay's public IFSC directory (no API key).
 * Returns null when not found / network error.
 */
export async function lookupIndiaIfsc(
  ifsc: string,
  signal?: AbortSignal
): Promise<IndiaIfscLookup | null> {
  const code = normalizeIfsc(ifsc);
  if (!isValidIfscFormat(code)) return null;

  const res = await fetch(`https://ifsc.razorpay.com/${code}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;

  const data = (await res.json()) as RazorpayIfscResponse;
  const bank = (data.BANK || "").trim();
  const branch = (data.BRANCH || "").trim();
  if (!bank && !branch) return null;

  return {
    ifsc: (data.IFSC || code).trim(),
    bank: bank.slice(0, 150),
    branch: branch.slice(0, 150),
    bankCode: (data.BANKCODE || "").trim(),
    address: (data.ADDRESS || "").trim(),
    city: (data.CITY || "").trim(),
    state: (data.STATE || "").trim(),
    upi: !!data.UPI,
  };
}
