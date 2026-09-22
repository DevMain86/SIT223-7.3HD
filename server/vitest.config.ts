// Vitest configuration for the server test suite.
// Supplies deterministic test values for every variable config.ts requires,
// and writes JUnit (for Jenkins) and lcov (for SonarCloud) reports.

import { defineConfig } from "vitest/config";

// A structurally valid but fake service account. config.ts checks its shape;
// firebaseAdmin is mocked in every test, so it is never used to authenticate.
const fakeServiceAccount = Buffer.from(
  JSON.stringify({
    project_id: "test-project",
    client_email: "test@test-project.iam.gserviceaccount.com",
    private_key: "test-key",
  })
).toString("base64");

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    clearMocks: true,

    // Set before any test file loads. dotenv never overrides a variable that is
    // already set, so a local .env cannot leak real credentials into the tests.
    env: {
      JWT_SECRET: "test-jwt-secret",
      SENDGRID_API_KEY: "SG.test-key",
      SENDER_EMAIL: "noreply@test.dev",
      FIREBASE_SERVICE_ACCOUNT_BASE64: fakeServiceAccount,
      APP_VERSION: "test",
    },

    // JUnit XML is published by Jenkins so results render in the build UI
    reporters: ["default", "junit"],
    outputFile: { junit: "test-results/junit.xml" },

    // lcov is consumed by SonarCloud for the coverage metric
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/index.ts",          // entry point: only calls listen()
        "src/types/**",          // type declarations, no runtime code
        "src/firebaseAdmin.ts",  // thin SDK wiring, mocked in tests; exercised by the deploy smoke test
      ],
    },
  },
});