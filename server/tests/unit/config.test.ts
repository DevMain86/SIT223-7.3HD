import { describe, it, expect, vi, afterEach } from "vitest";

const originalEnv = { ...process.env };

async function loadConfig() {
  vi.resetModules();
  return (await import("../../src/config.js")).config;
}

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64");

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("config", () => {
  it("loads and decodes a valid configuration", async () => {
    const config = await loadConfig();
    expect(config.jwtSecret).toBe("test-jwt-secret");
    expect(config.appVersion).toBe("test");
    expect(config.firebaseServiceAccount).toEqual({
      projectId: "test-project",
      clientEmail: "test@test-project.iam.gserviceaccount.com",
      privateKey: "test-key",
    });
  });

  it("reports every missing required variable in a single error", async () => {
    process.env.JWT_SECRET = "";
    process.env.SENDER_EMAIL = "";
    await expect(loadConfig()).rejects.toThrow(
      "Missing required environment variables: JWT_SECRET, SENDER_EMAIL"
    );
  });

  it("rejects a credential that is not base64-encoded JSON", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = "definitely-not-json";
    await expect(loadConfig()).rejects.toThrow("not valid base64-encoded JSON");
  });

  it("rejects a service account missing a required field", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = encode({
      project_id: "p",
      client_email: "c@p.iam.gserviceaccount.com",
    });
    await expect(loadConfig()).rejects.toThrow('missing the "private_key" field');
  });

  it("falls back to defaults when optional variables are blank", async () => {
    // Docker Compose passes an unset variable through as an empty string,
    // so blank must behave the same as absent
    process.env.PORT = "";
    process.env.APP_VERSION = "";
    const config = await loadConfig();
    expect(config.port).toBe(3000);
    expect(config.appVersion).toBe("dev");
  });

  it("uses PORT when it is set", async () => {
    process.env.PORT = "8081";
    const config = await loadConfig();
    expect(config.port).toBe(8081);
  });
});