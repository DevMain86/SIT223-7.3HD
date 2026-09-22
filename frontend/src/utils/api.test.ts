import { describe, it, expect } from "vitest";
import { API_BASE, apiUrl } from "./api";

describe("apiUrl", () => {
  it("prefixes a path with the /api base", () => {
    expect(apiUrl("/posts")).toBe("/api/posts");
  });

  // Guards the architecture: a hardcoded host here would tie every build to one
  // environment and break promotion of the same artefact from staging to production
  it("always produces a relative URL, never an absolute one", () => {
    expect(API_BASE.startsWith("/")).toBe(true);
    expect(apiUrl("/login")).not.toMatch(/^https?:\/\//);
  });
});