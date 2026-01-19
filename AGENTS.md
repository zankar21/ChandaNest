# AGENTS.md
# ChandaNest – Enterprise Real Estate Platform
# FINAL AUTHORITY FILE

This file defines the NON-NEGOTIABLE rules for development.
All contributors, AI agents, Codex instructions, and tools MUST follow this.

------------------------------------------------------------------
AUTHORITY ORDER (STRICT)
------------------------------------------------------------------
1) AGENTS.md
2) Project Instructions
3) Chat History
4) User Messages

If conflict exists → FOLLOW AGENTS.md ONLY.

------------------------------------------------------------------
1. PROJECT OVERVIEW
------------------------------------------------------------------
ChandaNest is a multi-tenant, enterprise-grade real estate SaaS for:
- Land
- Flats
- Rental properties

Supports:
- Public browsing (SEO, read-only)
- Secure admin dashboard
- Mobile clients (Flutter later)

Target:
Indian tier-2 cities first, globally scalable SaaS.

------------------------------------------------------------------
2. MONOREPO STRUCTURE (STRICT)
------------------------------------------------------------------
D:\ChandaNest\chandanest-platform\

services/
  api/               → Backend (Node.js + TypeScript + Express)

apps/
  web-public/        → Public website (NO AUTH)
  web-admin/         → Admin dashboard (AUTH REQUIRED)
  mobile/            → Flutter (future)

infrastructure/      → Firebase / Cloud configs

ABSOLUTE RULES:
- web-public and web-admin must NEVER share pages or components
- No cross-imports between apps
- Public UI ≠ Admin UI

------------------------------------------------------------------
3. TECH STACK (FIXED)
------------------------------------------------------------------
Backend:
- Node.js + TypeScript
- Express
- Firebase Admin SDK
- Firestore
- Firebase Storage
- Zod validation
- Google Cloud Run

Frontend:
- React + Vite
- TypeScript
- Tailwind CSS
- Axios

Mobile:
- Flutter (later phase)

No alternative stacks allowed without explicit approval.

------------------------------------------------------------------
4. AUTHENTICATION & AUTHORIZATION (NON-NEGOTIABLE)
------------------------------------------------------------------
PUBLIC APP (web-public):
- ✅ Public browsing (no auth) for read-only access
- ✅ Owner portal (Firebase Auth allowed for owners only)
- ❌ No App Check
- ✅ All access via backend APIs (no direct Firestore/Storage)

ADMIN APP (web-admin):
- ✅ Firebase Authentication
- ✅ Firebase ID Token in header ONLY

Header format:
Authorization: Bearer <ID_TOKEN>

FORBIDDEN:
- Tokens in query params
- Firebase download token URLs
- Client-side role enforcement

Roles (server-side only):
- tenant_admin: internal brokerage/admin user (full control within tenant)
- owner: independent property owner (self-listing only, KYC-gated publishing)
- master_admin
- client_admin
- enterprise
- broker
- seller
- member

------------------------------------------------------------------
5. MEDIA & STORAGE STRATEGY (OPTION A – FINAL)
------------------------------------------------------------------
ABSOLUTE RULE:
🚫 NEVER store or render Firebase download token URLs

Firestore MUST store ONLY:
objectPath: tenants/{tenantId}/properties/{propertyId}/media/gallery/x.webp

IMAGE RENDERING:
- Images rendered ONLY using signed GET URLs
- Signed URLs fetched from backend:
  GET /v1/tenants/{tenantId}/upload/sign-get

UPLOADS:
- Signed PUT URLs ONLY
- Client uploads directly to Firebase Storage
- Backend NEVER proxies file bytes

------------------------------------------------------------------
6. APP CHECK ENFORCEMENT (STRICT)
------------------------------------------------------------------
Endpoint Type               App Check
-------------------------------------
Public GET routes           ❌ NEVER
Admin READ routes           ❌ NEVER
Admin WRITE routes          ✅ REQUIRED
Upload sign-put             ✅ REQUIRED
Delete operations           ✅ REQUIRED

Rules:
- App Check enforced ONLY in production
- Missing/invalid App Check → 401
- Public access must NEVER be blocked by App Check

------------------------------------------------------------------
7. API DESIGN RULES (STRICT)
------------------------------------------------------------------
- All APIs versioned: /v1/*
- Naming conventions (MANDATORY):
  *.routes.ts
  *.controller.ts
  *.service.ts
  *.schemas.ts

- File naming: kebab-case ONLY
- Business logic NEVER inside routes
- Zod validation required for inputs

------------------------------------------------------------------
8. DATA MODEL SEPARATION
------------------------------------------------------------------
PUBLIC COLLECTIONS:
- publicProperties
- publicProjects

Usage:
- Browsing
- SEO
- Fast reads

PRIVATE COLLECTIONS:
- properties
- projects
- media
- users
- leads

RULE:
Admin writes MUST sync to public collections.

------------------------------------------------------------------
9. UI / UX PHILOSOPHY
------------------------------------------------------------------
- Enterprise-grade
- Clean, premium, minimal
- Mobile-first
- KPI-driven layouts
- No clutter
- No placeholder UI

Admin UI MUST feel different from Public UI.

------------------------------------------------------------------
10. RESPONSE & CODING EXPECTATIONS
------------------------------------------------------------------
- Always follow AGENTS.md
- Never suggest forbidden patterns
- Step-by-step instructions only
- Production-ready code only
- If unsure → ASK before assuming
- Codex instructions must be explicit and unambiguous

------------------------------------------------------------------
END OF FILE
------------------------------------------------------------------
