Field Audit (Owner Forms + Backend + Public Projection)

Scope
- Owner forms: apps/web-public/src/pages/owner/OwnerPostPropertyPage.tsx, OwnerEditListingPage.tsx
- Backend schema: services/api/src/modules/properties/properties.schemas.ts
- Listing doc: CreatePropertyInput stored under tenants/{tenantId}/listings/{listingId} + metadata
- Public projection: services/api/src/modules/properties/properties.service.ts buildPublicProjection()

A) Existing owner form fields (create/edit)

Land
- type, propertyType, title, description
- location: citySlug, locality, addressLine, pincode, geo (lat/lng)
- area: value, unit
- specs.land: facing
- landRecord: landType, mouza, surveyOrGatNo, wardOrWarg, taluka, district, naStatus, is712Available, roadAccess, waterSource, electricity
- plotInfo (for plot): layoutApproved, cornerPlot, facing
- pricing (sale): rate, totalPrice, rateUnit; (rent): rentPerMonth, deposit
- contact: name, phone, whatsapp, email, preferred

Flat
- bhk, bathrooms, carpetAreaSqFt, builtUpAreaSqFt
- pricing (sale/rent)
- contact

Rental
- rentPerMonth, deposit
- contact

B) Existing backend schema fields (before additions)

specs.land:
- landType, plotAreaSqFt, frontage, depth, facing, corner, roadWidth

specs.flat (shared with house):
- unitNo, tower, floor, bhk, bathrooms, carpetAreaSqFt, builtUpAreaSqFt

landRecord:
- landType, mouza, surveyOrGatNo, wardOrWarg, taluka, district,
  is712Available, naStatus, roadAccess, waterSource, electricity

pricing:
- currency, totalPrice, pricePerSqFt, rate, rateUnit, rentPerMonth, leaseAmount, leasePerMonth, maintenanceMonthly, deposit, negotiable

Public projection:
- title, type, propertyType, description, pricing, location, specs, plotInfo, landRecord, unit, area, media, contact

C) Public projection fields (used by PropertyDetails)
- Title, type, propertyType, pricing, location, specs, plotInfo, landRecord, area, media, contact

Checklist (new fields)
Field | Exists FE? | Exists schema? | Exists DB? | Used on PropertyDetails? | Action
specs.flat.floor | No | Partial (string) | Maybe | Yes | Add optional; allow number/string
specs.flat.totalFloors | No | No | No | Yes | Add
specs.flat.facing | No | No | No | Yes | Add
specs.flat.parking | No | No | No | Yes | Add
specs.flat.furnishing | No | No | No | Yes | Add
specs.flat.balconyCount | No | No | No | Yes | Add
specs.flat.buildingAgeYears | No | No | No | Yes | Add
specs.flat.lift | No | No | No | Yes | Add
specs.flat.powerBackup | No | No | No | Yes | Add
specs.flat.possessionStatus | No | No | No | Yes | Add
rental.leaseTermMonths | No | No | No | Yes | Add (optional, default 11)
rental.availableFrom | No | No | No | Yes | Add
rental.maintenance | No | No | No | Yes | Add
rental.maintenanceIncluded | No | No | No | Yes | Add
rental.preferredTenants | No | No | No | Yes | Add
rental.petsAllowed | No | No | No | Yes | Add
landRecord.boundaryWall | No | No | No | Yes | Add
landRecord.plotShape | No | No | No | Yes | Add
landRecord.frontageFeet | No | No | No | Yes | Add
