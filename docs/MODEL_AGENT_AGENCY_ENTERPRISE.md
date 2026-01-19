# MODEL: Agent / Agency / Enterprise

This document defines the planned agent/agency/enterprise model. Owner/Independent listing model is locked.

## Entities (Draft)

### Principal
- principalType: "owner" | "agent" | "agency" | "enterprise"
- principalId: string

### Agency
- id
- tenantId
- name
- legalName
- status: active | suspended
- createdAt, updatedAt

### Enterprise
- id
- tenantId
- name
- legalName
- status: active | suspended
- createdAt, updatedAt

### Membership
- orgType: "agency" | "enterprise"
- orgId
- userId
- role
- scopes: branchId?, teamId?
- status: active | suspended
- createdAt, updatedAt

### Roles (code-mapped)
- agency_admin
- agency_agent
- agency_crm
- enterprise_admin
- enterprise_sales
- enterprise_listing_manager
- enterprise_project_manager
- enterprise_compliance

### Lead
- listingId
- principalType
- principalId
- contact: name?, phone, email?
- message?
- status: new | contacted | qualified | lost | won
- createdAt, updatedAt

### LeadAssignment
- leadId
- assignedToUserId? | teamId?
- assignedBy
- assignedAt

### LeadActivity
- leadId
- type: call | note | whatsapp
- note
- createdBy
- createdAt

### Mandate
- ownerPrincipalRef
- agentOrAgencyPrincipalRef
- propertyId
- type: exclusive | non-exclusive
- validFrom, validTo
- permissions: canPublish, canEditPrice, canEditMedia
- status: pending | active | rejected | expired
Note: Assisted approval is allowed by tenant_admin when the owner cannot complete approval directly.

### VerificationCase
- orgType/orgId
- checklist
- status
- verifiedAt

### EnterpriseProject
- enterpriseId
- name
- status
- location?

### InventoryItem
- projectId
- unitType
- availability: available | hold | booked | sold
- pricing?

## Listing Lifecycle (Org Listings)
- draft -> review -> approved -> published
- published -> unpublished -> review/approved
- archived (final)

Transitions must be permission-gated by role.

## Guardrails (Owner Model Locked)
Do NOT modify owner listing flows, schemas, routes, UI, or permissions.

Existing owner listing endpoints (do not change):
- POST   /v1/tenants/:tenantId/listings
- PATCH  /v1/tenants/:tenantId/listings/:propertyId
- GET    /v1/tenants/:tenantId/listings
- GET    /v1/tenants/:tenantId/listings/:propertyId
- POST   /v1/tenants/:tenantId/listings/:propertyId/submit
- POST   /v1/tenants/:tenantId/listings/:propertyId/approve
- POST   /v1/tenants/:tenantId/listings/:propertyId/unpublish
- DELETE /v1/tenants/:tenantId/listings/:propertyId
- POST   /v1/tenants/:tenantId/listings/:propertyId/publish
- POST   /v1/tenants/:tenantId/listings/:propertyId/reject
- POST   /v1/tenants/:tenantId/listings/:propertyId/visibility
