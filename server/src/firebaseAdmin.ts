// Firebase Admin initialisation. Loads service account credentials,
// boots the Admin SDK, and exposes a Firestore instance for backend use.

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync("./serviceAccountKey.json", "utf-8")
);

initializeApp({
  credential: cert(serviceAccount),
});

export const db = getFirestore();
