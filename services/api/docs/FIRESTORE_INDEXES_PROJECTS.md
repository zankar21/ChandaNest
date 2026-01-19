# Firestore Indexes - Projects

This document lists the composite indexes required for the Projects module.

## Indexes derived from code (as of 2026-01-12)

### Public List (projects.service.ts::publicListProjects)
Query shape:
- collection: publicProjects
- where visibility.state == "published"
- optional where location.city == :city
- optional where type == :type
- optional where status == :status
- orderBy updatedAt desc
- orderBy __name__ desc
- startAfter(updatedAt, id) cursor

Indexes:
- Must-have: visibility.state ASC, updatedAt DESC, __name__ DESC
- Needed if city filter used: visibility.state ASC, location.city ASC, updatedAt DESC
- City filter can also require: location.city ASC, visibility.state ASC, updatedAt DESC, __name__ DESC
- Needed if type filter used: visibility.state ASC, type ASC, updatedAt DESC
- Needed if status filter used: visibility.state ASC, status ASC, updatedAt DESC

### Public Detail (projects.service.ts::publicGetProject)
Query shape:
- collection: publicProjects
- where slug == :slug
- where visibility.state == "published"
- limit 1

Indexes:
- Composite index required: slug ASC, visibility.state ASC

### Public Units (projects.service.ts::publicListProjectUnits)
Query shape:
- collection: publicProjectUnits
- where projectId == :projectId

Indexes:
- Single-field index on projectId (built-in). No composite index required.

### Admin List (projects.service.ts::listProjects)
Query shape:
- collection: tenants/{tenantId}/projects
- optional where type == :type
- optional where status == :status
- optional where visibility.state == :visibility
- orderBy updatedAt desc
- orderBy __name__ desc
- startAfter(updatedAt, id) cursor

Indexes:
- Needed if visibility filter used: visibility.state ASC, updatedAt DESC, __name__ DESC
- Needed if status filter used: status ASC, updatedAt DESC, __name__ DESC
- Needed if type filter used: type ASC, updatedAt DESC, __name__ DESC

## Admin collections

Collection: tenants/{tenantId}/projects

Queries used:
- List projects with filters and ordering
  - where visibility.state == "draft" or "published"
  - where type == "apartment" | "plot" | "commercial" | "mixed"
  - where status == "planning" | "under_construction" | "ready"
  - orderBy updatedAt desc
  - orderBy __name__ desc

Recommended composite indexes:
1) visibility.state ASC, updatedAt DESC, __name__ DESC
2) status ASC, updatedAt DESC, __name__ DESC
3) type ASC, updatedAt DESC, __name__ DESC

Collection: tenants/{tenantId}/projects/{projectId}/units

Queries used:
- List units (current admin path loads all units without filters)

Recommended composite index:
- None (single-field indexes are sufficient for the current query)

## Public collections

Collection: publicProjects

Queries used:
- Fetch project by slug
  - where slug == :slug
  - where visibility.state == "published"

Recommended composite index:
- slug ASC, visibility.state ASC

List projects (public)
- where visibility.state == "published"
- optional: location.city
- optional: status
- optional: type
- orderBy updatedAt desc
- orderBy __name__ desc

Recommended composite indexes:
1) visibility.state ASC, updatedAt DESC, __name__ DESC
2) visibility.state ASC, location.city ASC, updatedAt DESC, __name__ DESC
3) visibility.state ASC, status ASC, updatedAt DESC, __name__ DESC
4) visibility.state ASC, type ASC, updatedAt DESC, __name__ DESC

Note: __name__ represents documentId ordering when using FieldPath.documentId().

Collection: publicProjectUnits

Queries used:
- where projectId == :projectId

Recommended composite index:
- None (single-field index on projectId is sufficient)

## Optional index automation

If you use Firebase CLI for index management:
- Maintain firestore indexes in firestore.indexes.json
- Deploy with: firebase deploy --only firestore:indexes

This repo does not create or manage indexes automatically. Use the index link
from Firestore errors or add the indexes above to your Firebase project.

## Common Firestore index errors and fixes

- Error: "The query requires an index."
  - Click the index link in the error output and create the suggested composite index.
  - Ensure the fields and sort order match the query exactly.

- Error after schema change:
  - Re-run the query to get the updated index link. Index requirements change when
    you add/remove filters or change orderBy fields.

## If we change publicProjects docId to slug later

Pros:
- Direct document fetch by slug without a composite index.
- Simpler public detail lookup.

Cons:
- Slug changes become harder (must create new docId and migrate references).
- Requires strict slug uniqueness across tenants if public is not tenant-scoped.
- Any existing references to docId must be migrated.
