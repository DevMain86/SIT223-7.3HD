// Central configuration. The only module that reads process.env.
// Loads .env for local development, validates every required variable up front,
// and exports typed values so the rest of the app never touches process.env directly.

import "dotenv/config";
import type { ServiceAccount } from "firebase-admin/app";

const REQUIRED_VARS = [
  "JWT_SECRET",
  "SENDGRID_API_KEY",
  "SENDER_EMAIL",
  "FIREBASE_SERVICE_ACCOUNT_BASE64",
] as const;

type RequiredVar = (typeof REQUIRED_VARS)[number];

// Fail fast: report every missing variable at once, rather than one per restart
const missing = REQUIRED_VARS.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}. ` +
      "Set them in server/.env for local development, or inject them at runtime in CI/CD."
  );
}

// Safe after the check above: every required variable is present and non-empty
const env = (name: RequiredVar): string => process.env[name] as string;

// Decodes the base64-encoded service account JSON and checks the fields
// Firebase Admin actually needs, so a bad credential fails here with a clear message
function decodeServiceAccount(encoded: string): ServiceAccount {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is not valid base64-encoded JSON.");
  }

  for (const field of ["project_id", "client_email", "private_key"]) {
    if (typeof parsed?.[field] !== "string") {
      throw new Error(`Firebase service account is missing the "${field}" field.`);
    }
  }

  return {
    projectId: parsed.project_id as string,
    clientEmail: parsed.client_email as string,
    privateKey: parsed.private_key as string,
  };
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  // Optional: stamped in by the pipeline at build time; "dev" when running locally
  appVersion: process.env.APP_VERSION ?? "dev",
  jwtSecret: env("JWT_SECRET"),
  sendgridApiKey: env("SENDGRID_API_KEY"),
  senderEmail: env("SENDER_EMAIL"),
  firebaseServiceAccount: decodeServiceAccount(env("FIREBASE_SERVICE_ACCOUNT_BASE64")),
};