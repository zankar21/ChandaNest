ChandaNest API

Example requests:

1) sign-put
POST http://localhost:8080/v1/media/sign-put
Body:
{
  "objectPath": "tenants/powerpulsetech/projects/RN-001/media/gallery/1.webp",
  "contentType": "image/webp"
}

2) sign-get
POST http://localhost:8080/v1/media/sign-get
Body:
{
  "paths": ["tenants/powerpulsetech/projects/RN-001/media/gallery/1.webp"]
}

How to call sign-put/sign-get with Authorization Bearer token:
- Include header `Authorization: Bearer <Firebase_ID_Token>` obtained from Firebase Auth client.
- App Check: send `X-Firebase-AppCheck: <token>` when strict mode is enabled (production); in development it is optional when ALLOW_APP_CHECK_OPTIONAL=true.
- Tenant is derived from the authenticated user's custom claim (tenantId) or Firestore users/{uid} fallback; request bodies no longer accept tenantId directly.

KYC examples:
1) Sign PUT for KYC
POST http://localhost:8080/v1/kyc/sign-put
Body:
{
  "docType": "aadhaar",
  "side": "front",
  "contentType": "image/webp"
}

2) Submit KYC
POST http://localhost:8080/v1/kyc/submit
Body: include uploaded objectPaths under tenants/public/kyc/{uid}/...

3) Approve KYC (admin)
POST http://localhost:8080/v1/kyc/approve
Body:
{
  "uid": "<userUid>",
  "action": "verify",
  "remarks": "ok"
}

Firebase Admin Credentials (Local)
- Set GOOGLE_APPLICATION_CREDENTIALS to your local service account key.
- PowerShell example:
  $env:GOOGLE_APPLICATION_CREDENTIALS="D:\chandanest\secrets\chandanest-dev-sa.json"
  cd services/api
  npm run auth:create-test-users
- Keep the key file outside the repo and never commit it.

