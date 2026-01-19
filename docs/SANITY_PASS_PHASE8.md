# Phase 8 Sanity Pass

## Environment
- Expected: API at http://localhost:8080, web-admin at http://localhost:5173, web-public at http://localhost:5174 (or similar).
- Actual: Not verified in this run. Local services were not started by the assistant.

## Backend Quick Smoke (curl)
Note: Requests use placeholder `ID_TOKEN`. Results reflect local environment without active tokens/services.

1) GET /v1/tenants/:tenantId/principals/me
- Command: `curl -H "Authorization: Bearer ID_TOKEN" http://localhost:8080/v1/tenants/powerpulsetech/principals/me`
- Expected: `{ ok:true, tenantId, principals:[...] }`
- Actual: `{"ok":false,"error":{"message":"Invalid or expired token","code":"UNAUTHORIZED"}}`
- Fix applied: none

2) Agencies
- POST /agencies
  - Actual: `{"message":"Expected property name or '}' in JSON at position 1 (line 1 column 2)"}`
- GET /agencies
  - Actual: `{"ok":false,"error":{"message":"Invalid or expired token","code":"UNAUTHORIZED"}}`
- POST /agencies/:id/members
  - Actual: `{"message":"Expected property name or '}' in JSON at position 1 (line 1 column 2)"}`
- Expected: create/list/add member
- Fix applied: none

3) Enterprises
- POST /enterprises
  - Actual: `{"message":"Expected property name or '}' in JSON at position 1 (line 1 column 2)"}`
- POST /enterprises/:id/members
  - Actual: `{"message":"Expected property name or '}' in JSON at position 1 (line 1 column 2)"}`
- Expected: create/add member
- Fix applied: none

4) OrgListings
- POST /org-listings
  - Actual: `{"message":"Expected property name or '}' in JSON at position 1 (line 1 column 2)"}`
- POST /org-listings/:id/transition submit
  - Actual: `{"message":"Expected property name or '}' in JSON at position 1 (line 1 column 2)"}`
- Expected: draft -> review
- Fix applied: none

5) Leads
- POST /v1/public/leads
  - Actual: `{"message":"Expected property name or '}' in JSON at position 1 (line 1 column 2)"}`
- Expected: lead created for published listing
- Fix applied: none

6) Mandates
- POST /mandates/request
  - Actual: `{"message":"Expected property name or '}' in JSON at position 1 (line 1 column 2)"}`
- POST /mandates/:id/approve
  - Actual: `{"message":"Expected property name or '}' in JSON at position 1 (line 1 column 2)"}`
- Expected: pending -> active
- Fix applied: none

7) OrgDocs/Verification
- POST /org-docs
  - Actual: `{"message":"Expected property name or '}' in JSON at position 1 (line 1 column 2)"}`
- GET /org-verification/:orgType/:orgId
  - Actual: `{"ok":false,"error":{"message":"Invalid or expired token","code":"UNAUTHORIZED"}}`
- POST /org-verification/:orgType/:orgId/decide
  - Actual: `{"message":"Expected property name or '}' in JSON at position 1 (line 1 column 2)"}`
- Expected: doc registered, verification case returned, decision saved
- Fix applied: none

## Web-Admin Click-Through
Note: UI sanity pass requires authenticated sessions; not performed in this run.

1) Agencies
- Expected: list loads, create for tenant_admin, members manage
- Actual: Not executed
- Fix applied: none

2) Enterprises
- Expected: list/create/detail/members and projects link
- Actual: Not executed
- Fix applied: none

3) Enterprise Projects + Inventory
- Expected: create project, add inventory, status updates
- Actual: Not executed
- Fix applied: none

4) Org Listings workflow
- Expected: draft -> review -> approved -> published; edit blocked when published
- Actual: Not executed
- Fix applied: none

5) Mandate-required path
- Expected: publish blocked with MANDATE_REQUIRED; mandate request/approve; publish succeeds
- Actual: Not executed
- Fix applied: none

6) Leads end-to-end
- Expected: lead appears in admin; status/assignment/activity updates
- Actual: Not executed
- Fix applied: none

7) Verification end-to-end
- Expected: doc metadata updates checklist; verify/reject works
- Actual: Not executed
- Fix applied: none

## Summary
- PASS/FAIL: FAIL (runtime checks not executed due to missing auth tokens/sessions and request bodies rejected in curl smoke).
- Fixes applied: none during this phase.

## Automation
- `apps/web-admin`: `npm run build` (PASS)
- `services/api`: `npm test` (PASS)

## Local-only smoke runner
1) Set env vars (PowerShell):
   - `$env:ID_TOKEN_A="..."` (tenant_admin)
   - `$env:ID_TOKEN_B="..."` (normal user)
   - Optional: `$env:API_BASE="http://localhost:8080"`
   - Optional: `$env:TENANT_ID="powerpulsetech"`
2) Run:
   - `npm run sanity:phase8` (from `services/api`)
3) Open this file to view the appended “Automated curl run” section.
