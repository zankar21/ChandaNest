import { firestore } from "../../config/firebase";

export function projectsCollection(tenantId: string) {
  return firestore.collection("tenants").doc(tenantId).collection("projects");
}
