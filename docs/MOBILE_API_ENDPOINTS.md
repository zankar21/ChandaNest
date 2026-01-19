# ChandaNest Mobile API Endpoints (from services/api)

This document lists the real backend endpoints and response shapes used by the web clients, so mobile can map contracts correctly. Paths are relative to the API base URL.

## Base prefixes
- Health: `GET /health`
- Public: `GET/POST /v1/public/*`
- Media: `POST /v1/media/*` (auth) and `POST /v1/public/media/*` (public signed GET)
- Admin: `GET/POST /v1/admin/*`
- Tenant scoped: `/v1/tenants/:tenantId/*`
- Projects (public + admin): `/v1/public/projects*` and `/v1/admin/projects*`

## Auth headers
- Authenticated endpoints require Firebase ID token:
  - `Authorization: Bearer <ID_TOKEN>`
- Public endpoints do not require auth.
- App Check is required for admin writes (enforced in middleware).

## Route mounts (services/api/src/app.ts)
- `/v1/public`: `publicRouter`, `publicNearbyRouter`, `nearbyRouter`
- `/v1/media`: `mediaRouter`
- `/v1`: `projectsRouter`, `propertiesRouter`, `tenantsRouter`, `metaRouter`, `publicSeoRouter`, `buyerRequestsRouter`
- `/v1/admin/*`: `adminBusinessRequestsRouter`, `billingRouter`, `teamRouter`, `leadsRouter`, `aiDescriptionsRouter`
- `/v1/tenants/:tenantId/*`: principals/agencies/enterprises/org-listings/mandates/org-docs/org-verification

## Endpoint table (core for mobile)

### Public properties
- `GET /v1/public/properties`
  - Module: `properties` -> `publicListHandler`
  - Auth: public
  - Query params (PublicListQuerySchema):
    - `citySlug`, `propertyType`, `type`, `mode`, `projectId`, `limit`
  - Response shape:
    ```json
    { "ok": true, "data": { "items": [ { "id": "propId", "listingId": "...", "tenantId": "...", "title": "...", "type": "...", "propertyType": "...", "location": { "citySlug": "...", "locality": "...", "addressLine": "...", "geo": { "lat": 0, "lng": 0 } }, "media": { "hero": { "objectPath": "..." }, "gallery": [ { "objectPath": "..." } ] }, "pricing": { "rate": 0, "rateUnit": "sqft" }, "updatedAt": "..." } ] } }
    ```
  - Source: `properties.service.ts` -> `buildPublicProjection`, `listPublicProperties`

- `GET /v1/public/properties/:propertyId`
  - Module: `properties` -> `publicGetHandler`
  - Auth: public
  - Response shape:
    ```json
    { "ok": true, "data": { "id": "propId", "...": "full publicProperties doc" } }
    ```

### Public projects
- `GET /v1/public/projects`
  - Module: `projects` -> `publicListProjectsHandler`
  - Auth: public
  - Query params (PublicProjectListQuerySchema):
    - `city`, `q`, `type`, `status`, `minPrice`, `maxPrice`, `limit`, `cursor`
  - Response shape:
    ```json
    { "ok": true, "data": { "items": [ { "id": "projectId", "slug": "...", "name": "...", "type": "...", "status": "...", "location": { "city": "...", "area": "...", "addressLine": "...", "lat": 0, "lng": 0 }, "priceRange": { "min": 0, "max": 0, "currency": "INR" }, "media": { "cover": { "objectPath": "..." }, "gallery": [ { "objectPath": "..." } ], "brochure": { "objectPath": "..." } }, "visibility": { "state": "published" }, "counts": { "totalUnits": 0, "availableUnits": 0 }, "updatedAt": "..." } ], "nextCursor": "..." } }
    ```
  - Source: `projects.service.ts` -> `publicListProjects`

- `GET /v1/public/projects/:slug`
  - Module: `projects` -> `publicGetProjectHandler`
  - Auth: public
  - Response shape:
    ```json
    { "ok": true, "data": { "id": "projectId", "...": "publicProjects doc" } }
    ```

- `GET /v1/public/projects/:slug/units`
  - Module: `projects` -> `publicListProjectUnitsHandler`
  - Auth: public
  - Response shape:
    ```json
    { "ok": true, "data": { "items": [ { "id": "unitId", "projectId": "...", "unitId": "...", "type": "...", "areaSqFt": 0, "price": 0, "floor": 0, "availability": "..." } ] } }
    ```

### Public leads (enquiry)
- `POST /v1/public/leads`
  - Module: `leads` -> `publicCreateLeadHandler`
  - Auth: public (App Check not required for public writes as per policy)
  - Request body (PublicLeadCreateSchema):
    ```json
    {
      "tenantId": "optional",
      "subject": { "kind": "property|project|general", "propertyId": "...", "projectId": "...", "projectSlug": "...", "title": "...", "href": "...", "city": "...", "area": "..." },
      "contact": { "name": "...", "phone": "...", "email": "...", "message": "..." },
      "source": { "page": "property|project|home|map|search", "utm": { "source": "...", "medium": "...", "campaign": "..." } },
      "website": "honeypot optional"
    }
    ```
  - Response shape:
    ```json
    { "ok": true, "data": { "leadId": "..." } }
    ```
  - If honeypot triggered, returns 204 with no body.

### Media signing (public)
- `POST /v1/public/media/sign-get`
  - Module: `public` -> `publicSignGet`
  - Auth: public
  - Request:
    ```json
    { "paths": [ "tenants/{tenantId}/properties/{propertyId}/media/hero.webp" ] }
    ```
  - Response:
    ```json
    { "ok": true, "data": { "items": [ { "objectPath": "...", "url": "...", "expiresAt": "ISO" } ] } }
    ```

### Nearby (optional for map)
- `GET /v1/public/properties/:propertyId/nearby`
  - Module: `publicNearby` -> `publicNearbyHandler`
  - Auth: public
- `POST /v1/public/nearby/distance-matrix`
  - Module: `nearby` -> `distanceMatrixHandler`
  - Auth: public

### Owner/tenant auth and profile
- `GET /v1/tenants/:tenantId/me`
  - Module: `tenants` -> `getMeHandler`
  - Auth: Firebase ID token required
  - Response shape (used by web-public):
    ```json
    { "ok": true, "data": { "kycStatus": "...", "role": "...", "tenantId": "...", "phoneNumber": "...", "fullName": "..." } }
    ```
  - Note: There are no OTP endpoints in services/api. Owner auth is handled by Firebase Auth in the client and then used with the ID token.

### Owner listings (tenant scoped)
- `GET /v1/tenants/:tenantId/listings?mine=1`
  - Module: `properties` -> `listHandler`
  - Auth: Firebase ID token required
  - Response shape:
    ```json
    { "ok": true, "data": { "items": [ { "id": "listingId", "title": "...", "propertyType": "...", "location": { "citySlug": "...", "locality": "...", "geo": { "lat": 0, "lng": 0 } }, "media": { "hero": { "objectPath": "..." } }, "pricing": { "rate": 0 } } ] } }
    ```

### Admin leads (closest match for owner leads)
- `GET /v1/admin/leads?tenantId=...`
  - Module: `leads` -> `listLeadsHandler`
  - Auth: Firebase ID token required, admin roles only
  - Response shape:
    ```json
    { "ok": true, "data": { "items": [ { "id": "leadId", "tenantId": "...", "subject": { ... }, "contact": { ... }, "stage": "new", "status": { "isOpen": true }, "assignee": { ... }, "source": { ... }, "priority": "medium", "createdAt": "...", "updatedAt": "..." } ], "nextCursor": "..." } }
    ```

## Mobile contract mapping (recommended)

### Home: getHome(citySlug)
- No `/v1/public/home` endpoint exists.
- Use:
  - `GET /v1/public/properties?citySlug={citySlug}&limit=6`
  - `GET /v1/public/projects?city={CityName}&limit=4`
- Map to `HomePayload` in mobile.

### Explore: search(citySlug, filters, cursor)
- Use `GET /v1/public/properties` with:
  - `citySlug`, `propertyType`, `type`, `mode`, `projectId`, `limit`
- Note: No `q`, `sort`, `minPrice`, `maxPrice` in public properties query today.
  - Client-side filtering can be used until API adds support.

### Map: getPins(citySlug, bounds, filters)
- No pins endpoint exists.
- Use `GET /v1/public/properties?citySlug=...` and filter client-side to only items with `location.geo`.
- Suggested minimal addition (if needed): `GET /v1/public/properties/pins` returning `{ items: [{ id, lat, lng, price, type }] }`.

### Details: getDetails(propertyId)
- Use `GET /v1/public/properties/:propertyId`.

### Leads: createLead(payload)
- Use `POST /v1/public/leads` with `subject/contact/source`.
- Handle 204 for honeypot.

### OwnerAuth: startOtp, verifyOtp, me
- No OTP endpoints in services/api.
- Use Firebase Auth client-side for OTP.
- Use `GET /v1/tenants/:tenantId/me` to fetch profile using Firebase ID token.

### OwnerListings: listMyProperties
- Use `GET /v1/tenants/:tenantId/listings?mine=1` with Firebase ID token.

### OwnerLeads: listMyLeads
- No owner-scoped leads endpoint exists.
- Closest is `GET /v1/admin/leads?tenantId=...` (admin-only). Owner role may not have access.
- Suggested minimal addition (if needed): `GET /v1/tenants/:tenantId/leads?mine=1` for owner-scoped lead access.

## Missing endpoints (for mobile contracts)
- `/v1/public/home` (compose client-side for now).
- `/v1/public/properties/pins` (optional; use list + filter).
- `/v1/owner/auth/otp/*` (use Firebase Auth client-side).
- Owner leads endpoint (admin-only today).

## Notes on response envelopes
- All endpoints return `{ ok: true, data: ... }` on success.
- Mobile API client should read `data` and handle `{ ok: false, error: { message, code } }` for failures.
