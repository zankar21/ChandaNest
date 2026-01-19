# Migration Notes - Projects Module

## What's new
- Tenant-scoped projects and units:
  - tenants/{tenantId}/projects/{projectId}
  - tenants/{tenantId}/projects/{projectId}/units/{unitId}
- Public mirrors:
  - publicProjects/{projectId}
  - publicProjectUnits/{projectId}_{unitId}
- Admin endpoints under /v1/admin/projects
- Public endpoints under /v1/public/projects

## No breaking changes
- Existing routes remain available via legacy aliases where applicable.
- Existing property listings are unchanged.

## Data backfill (one-time idea)
If older tenant projects exist without visibility or counts:
- Set visibility.state="draft" for unpublished projects.
- Compute counts.totalUnits and counts.availableUnits from units.
- Optionally publish selected projects to populate publicProjects.

## Index creation required
Create Firestore composite indexes listed in:
- services/api/docs/FIRESTORE_INDEXES_PROJECTS.md
