import { describe, it, expect } from "vitest";
import { formatDate } from "./formatDate";

// Timestamps at midday UTC fall on the same calendar day in every timezone from
// UTC-11 to UTC+11, so these results hold even if the TZ pin were ever removed.
const at = (iso: string) => ({ _seconds: Date.parse(iso) / 1000, _nanoseconds: 0 });

describe("formatDate", () => {
  it("formats a Firestore timestamp as an Australian date", () => {
    expect(formatDate(at("2026-09-22T12:00:00Z"))).toBe("22/09/2026");
  });

  it("zero-pads single-digit days and months", () => {
    expect(formatDate(at("2026-03-05T12:00:00Z"))).toBe("05/03/2026");
  });

  it("handles a leap day", () => {
    expect(formatDate(at("2028-02-29T12:00:00Z"))).toBe("29/02/2028");
  });
});