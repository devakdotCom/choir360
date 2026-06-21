# CHOIR360 Storage, Database, and Sync Architecture

CHOIR360 uses Cloudinary for media and Firebase for application data. Firestore is the source of truth for every portal: admin, member, public, calendar, attendance, payments, songs, notifications, and Cloudinary media records.

## Source Of Truth

Cloudinary stores binary media only:

- Member profile photos
- Event banners and feast posters
- Choir and gallery photos
- Song cover images and document previews
- Parish and diocese images
- AI-generated posters and QR code images

Firestore stores all relational metadata and app state:

- Authentication identity and role claims
- Member, choir, parish, diocese, Mass, event, attendance, payment, share, song, calendar, notification, approval, audit, and setting records
- Cloudinary media metadata records
- Soft-delete state

Cloudinary URLs must never be the only reference. Every upload creates a Firestore `cloudinaryMedia` record containing `publicId`, `secureUrl`, `thumbnailUrl`, `optimizedUrl`, `uploadedAt`, `uploadedByUserId`, `moduleName`, and `relatedRecordId`.

## Mandatory Record Envelope

Every persisted Firestore document must include:

```ts
createdAt
updatedAt
createdBy
updatedBy
status
tenantId
parishId
choirId
```

Deletion is soft by default using:

```ts
status: "deleted"
deletedAt
deletedBy
```

## Firestore Collections

Use top-level tenant-scoped collections with indexed fields:

```text
members
choirs
masses
events
attendance
payments
paymentShares
songs
calendars
notifications
approvalWorkflows
auditLogs
appSettings
cloudinaryMedia
```

All reads must filter by `tenantId`, `parishId`, `choirId`, and `status != "deleted"` unless the user is a super admin viewing global data.

## Sync Rules

- Admin updates write to Firestore through `upsertTenantRecord` or `updateTenantRecord`.
- Member updates write to the same documents or an approval workflow document when approval is required.
- Portals subscribe with real-time listeners only on high-value live screens such as active dashboard, approvals, calendar, current Mass roster, attendance check-in, notifications, and payment settlement.
- Long lists use pagination, `limit`, cached state, and lazy loading.
- Derived values such as payment shares are written as locked `paymentShares` records. Screens read the locked result instead of recalculating independently.
- Media upload is two-phase: signed upload to Cloudinary, then immediate Firestore metadata write. If Firestore write fails, the upload is considered incomplete and must be retried or reconciled by audit.

## Cloudinary Upload Flow

1. Client asks `/api/cloudinary/signature` for a short-lived signed upload payload.
2. Client uploads the file directly to Cloudinary.
3. Client builds:
   - `secureUrl`
   - `thumbnailUrl`
   - `optimizedUrl`
   - `publicId`
   - module and record references
4. Client writes the metadata to `cloudinaryMedia`.
5. Related document stores only `mediaId` or a small cached display URL. The canonical media record remains `cloudinaryMedia/{id}`.

## Firebase Free Plan Discipline

- Prefer one listener per active screen, not per card.
- Use `limit`, sorted indexes, and route-level lazy loading.
- Avoid duplicate collection copies. Store references by ID.
- Cache static catalogs like song metadata and app settings.
- Batch writes for payment settlement, attendance session close, and event creation.
- Use audit logs selectively for material changes: approvals, payments, role changes, attendance corrections, and media replacements.

## Relationship Integrity

- Members reference `tenantId`, `parishId`, `choirId`.
- Attendance references `memberId` and `massId` or `eventId`.
- Payments reference `massId`; shares reference `paymentId` and participating `memberId`s.
- Events reference media through `bannerMediaId`.
- Songs reference cover/audio/video/media through media IDs.
- Notifications reference the triggering record by `moduleName` and `relatedRecordId`.

This keeps the admin portal, member portal, public portal, calendar, attendance, payments, events, songs, notifications, and Cloudinary media records synchronized from the same Firestore source of truth.
