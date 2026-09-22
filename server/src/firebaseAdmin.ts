import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { config } from "./config.js";

initializeApp({
  credential: cert(config.firebaseServiceAccount),
});

export const db = getFirestore();