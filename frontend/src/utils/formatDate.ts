// Convert Firestore timestamp to readable date
import type { FirestoreTimestamp } from "../types/post";

export function formatDate(ts: FirestoreTimestamp) {
  return new Date(ts._seconds * 1000).toLocaleDateString("en-AU");
}
