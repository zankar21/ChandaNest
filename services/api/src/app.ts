import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorMiddleware } from "./middlewares/error.middleware";
import { mediaRouter } from "./modules/media/media.routes";
import { publicRouter } from "./modules/public/public.routes";
import { publicNearbyRouter } from "./modules/publicNearby/publicNearby.routes";
import { nearbyRouter } from "./modules/nearby/nearby.routes";
import { kycRouter } from "./modules/kyc/kyc.routes";
import { propertiesRouter } from "./modules/properties/properties.routes";
import { publicSeoRouter } from "./modules/publicSeo/publicSeo.routes";
import { buyerRequestsRouter } from "./modules/buyerRequests/buyerRequests.routes";
import { principalsRouter } from "./modules/principals/principals.routes";
import { agenciesRouter } from "./modules/agencies/agencies.routes";
import { enterprisesRouter } from "./modules/enterprises/enterprises.routes";
import { orgListingsRouter } from "./modules/orgListings/orgListings.routes";
import { leadsRouter } from "./modules/leads/leads.routes";
import { enterpriseProjectsRouter } from "./modules/enterpriseProjects/enterpriseProjects.routes";
import { enterpriseInventoryRouter } from "./modules/enterpriseInventory/enterpriseInventory.routes";
import { projectsRouter } from "./modules/projects/projects.routes";
import { metaRouter } from "./modules/meta/meta.routes";
import { tenantsRouter } from "./modules/tenants/tenants.routes";
import { mandatesRouter } from "./modules/mandates/mandates.routes";
import { orgDocsRouter } from "./modules/orgDocs/orgDocs.routes";
import { orgVerificationRouter } from "./modules/orgVerification/orgVerification.routes";
import { adminBusinessRequestsRouter } from "./modules/adminBusinessRequests/adminBusinessRequests.routes";
import { billingRouter } from "./modules/billing/billing.routes";
import { teamRouter } from "./modules/team/team.routes";
import aiDescriptionsRouter from "./modules/aiDescriptions/aiDescriptions.routes";

const app = express();

app.use(helmet());
app.use(express.json());
app.use(
  cors({
    origin: env.corsOrigins.length > 0 ? env.corsOrigins : undefined
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/v1/public", publicRouter);
app.use("/v1/public", publicNearbyRouter);
app.use("/v1/public", nearbyRouter);
app.use("/v1/media", mediaRouter);
app.use("/v1/kyc", kycRouter);
app.use("/v1", projectsRouter);
app.use("/v1", propertiesRouter);
app.use("/v1", tenantsRouter);
app.use("/v1", metaRouter);
app.use("/v1", publicSeoRouter);
app.use("/v1", buyerRequestsRouter);
app.use("/v1/admin/business-requests", adminBusinessRequestsRouter);
app.use("/v1/admin/billing", billingRouter);
app.use("/v1/admin/team", teamRouter);
app.use("/v1/admin/leads", leadsRouter);
app.use("/v1/admin", aiDescriptionsRouter);
app.use("/v1/tenants/:tenantId/principals", principalsRouter);
app.use("/v1/tenants/:tenantId/agencies", agenciesRouter);
app.use("/v1/tenants/:tenantId/enterprises", enterprisesRouter);
app.use("/v1/tenants/:tenantId/org-listings", orgListingsRouter);
app.use("/v1/tenants/:tenantId/mandates", mandatesRouter);
app.use("/v1/tenants/:tenantId/org-docs", orgDocsRouter);
app.use("/v1/tenants/:tenantId/org-verification", orgVerificationRouter);
app.use("/v1/tenants/:tenantId/enterprises/:enterpriseId/projects", enterpriseProjectsRouter);
app.use(
  "/v1/tenants/:tenantId/enterprises/:enterpriseId/projects/:projectId/inventory",
  enterpriseInventoryRouter
);

app.use(errorMiddleware);

export { app };
