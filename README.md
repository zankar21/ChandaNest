# ChandaNest – Enterprise Real Estate Platform

ChandaNest is a **multi-tenant, enterprise-grade real estate SaaS** designed for
Indian tier-2 cities, scalable globally.

## Platform Scope
- Land listings
- Flat projects
- Rental properties

## Applications
- **web-public** → SEO-friendly public browsing (read-only)
- **web-admin** → Secure admin dashboard
- **mobile** → Flutter (planned)

## Core Principles
- Strict separation between public and admin apps
- Secure, scalable backend architecture
- No Firebase download token URLs
- Signed URL–based media access
- Server-side authorization only

## Tech Stack
**Backend**
- Node.js + TypeScript + Express
- Firestore + Firebase Storage
- Zod validation
- Google Cloud Run

**Frontend**
- React + Vite + Tailwind CSS
- TypeScript + Axios

## Security Model
- Public app: no auth, no App Check
- Admin app: Firebase Auth (ID token in header only)
- App Check enforced only on sensitive admin write operations

## Media Handling
- Firestore stores only `objectPath`
- Images rendered using signed GET URLs
- Uploads via signed PUT URLs
- Backend never proxies file bytes

## Storage CORS
To enable browser uploads to Firebase Storage (signed PUT URLs), apply the bucket CORS config:

```bash
gcloud auth login
gcloud config set project chandanest-dev
gsutil cors set infrastructure/storage-cors.json gs://chandanest-dev.firebasestorage.app
gsutil cors get gs://chandanest-dev.firebasestorage.app
```

## Governance
⚠️ **AGENTS.md is the final authority for this repository.**  
All contributors must read it before making changes.

---

© PowerPulse Technologies
