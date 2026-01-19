import { firestore } from "../../config/firebase";
import { logger } from "../../utils/logger";
import { AuthUser } from "../../types";
import {
  PrincipalScopeResponseSchema,
  type PrincipalScopeItem
} from "./principals.schemas";

type MembershipDoc = {
  tenantId?: string;
  userId?: string;
  orgType?: "agency" | "enterprise";
  orgId?: string;
  role?: string;
  status?: string;
};

type AgentDoc = {
  name?: string;
};

type PrincipalDeps = {
  fetchMemberships: (tenantId: string, userId: string) => Promise<MembershipDoc[]>;
  fetchAgent: (tenantId: string, userId: string) => Promise<AgentDoc | null>;
  fetchOrgLabel: (
    tenantId: string,
    orgType: "agency" | "enterprise",
    orgId: string
  ) => Promise<string | null>;
};

const defaultDeps: PrincipalDeps = {
  async fetchMemberships(tenantId, userId) {
    const snap = await firestore
      .collection("memberships")
      .where("tenantId", "==", tenantId)
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .get();
    return snap.docs.map((doc) => doc.data() as MembershipDoc);
  },
  async fetchAgent(tenantId, userId) {
    const ref = firestore.collection("tenants").doc(tenantId).collection("agents").doc(userId);
    const snap = await ref.get();
    if (!snap.exists) return null;
    return snap.data() as AgentDoc;
  },
  async fetchOrgLabel(tenantId, orgType, orgId) {
    try {
      const ref = firestore
        .collection("tenants")
        .doc(tenantId)
        .collection(orgType === "agency" ? "agencies" : "enterprises")
        .doc(orgId);
      const snap = await ref.get();
      if (!snap.exists) return null;
      const data = snap.data() as { name?: string } | undefined;
      return data?.name ?? null;
    } catch (err) {
      logger.warn("Failed to load org label", err);
      return null;
    }
  }
};

export async function getMyPrincipals(
  input: { tenantId: string; user: AuthUser },
  deps: PrincipalDeps = defaultDeps
) {
  const { tenantId, user } = input;
  const principals: PrincipalScopeItem[] = [];

  const ownerLabel = (user as any).displayName || user.email || "Owner";
  principals.push({
    type: "owner",
    id: user.uid,
    label: ownerLabel,
    role: "owner"
  });

  try {
    const memberships = await deps.fetchMemberships(tenantId, user.uid);
    const labelMap = new Map<string, string>();
    await Promise.all(
      memberships.map(async (membership) => {
        if (!membership.orgType || !membership.orgId) return;
        const label = await deps.fetchOrgLabel(tenantId, membership.orgType, membership.orgId);
        if (label) {
          labelMap.set(`${membership.orgType}:${membership.orgId}`, label);
        }
      })
    );
    memberships.forEach((membership) => {
      if (membership.orgType === "agency" && membership.orgId) {
        principals.push({
          type: "agency",
          id: membership.orgId,
          label: labelMap.get(`agency:${membership.orgId}`) || "Agency",
          role: membership.role,
          orgType: "agency",
          orgId: membership.orgId
        });
      }
      if (membership.orgType === "enterprise" && membership.orgId) {
        principals.push({
          type: "enterprise",
          id: membership.orgId,
          label: labelMap.get(`enterprise:${membership.orgId}`) || "Enterprise",
          role: membership.role,
          orgType: "enterprise",
          orgId: membership.orgId
        });
      }
    });
  } catch (err) {
    logger.warn("Failed to load memberships for principals", err);
  }

  try {
    const agentDoc = await deps.fetchAgent(tenantId, user.uid);
    if (agentDoc) {
      principals.push({
        type: "agent",
        id: user.uid,
        label: agentDoc.name || "Agent",
        role: "agent_admin"
      });
    }
  } catch (err) {
    logger.warn("Failed to load agent principal", err);
  }

  return PrincipalScopeResponseSchema.parse({
    ok: true,
    tenantId,
    principals
  });
}
