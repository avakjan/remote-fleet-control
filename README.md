# Remote Fleet Control

A small full-stack fleet control system built for the Bliq backend and frontend
challenge. It provides vehicle management, safe remote-operator assignments,
and a responsive interface for monitoring and changing vehicle connectivity.

## Stack

- NestJS 11 with Mongoose
- MongoDB 8
- Next.js 16 with React 19
- TypeScript throughout
- npm workspaces

The repository contains:

- `apps/api`: NestJS REST API
- `apps/web`: Next.js frontend
- `compose.yaml`: local MongoDB

## Prerequisites

- Node.js 22 or newer
- npm 11 or newer
- Docker Desktop with Docker Compose

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start MongoDB:

   ```bash
   docker compose up -d
   ```

3. Start the API and frontend:

   ```bash
   npm run dev
   ```

4. Open:

   - Frontend: http://localhost:3000
   - API health: http://localhost:3001/api/health

Defaults work without environment files. To override API settings, copy
`.env.example` to `.env`. To point the frontend to another API, copy
`apps/web/.env.local.example` to `apps/web/.env.local`.

## Seed data

The optional seeded-operator approach was chosen instead of operator CRUD.
Startup performs idempotent upserts for three operators and four vehicles, so
existing records and assignments are not reset. Operator IDs needed by the
assignment endpoints are available from `GET /api/operators`.

The frontend includes the required vehicle list and online/offline controls.
It also provides an active-operator selector with takeover and release actions,
using the same assignment rules as the API.

## API

All endpoints use the `/api` prefix.

Vehicle endpoints:

- `POST /vehicles`: create a vehicle
- `GET /vehicles`: list vehicles
- `GET /vehicles/:id`: get one vehicle
- `PATCH /vehicles/:id`: update its code, name, or online state
- `DELETE /vehicles/:id`: delete an unassigned vehicle
- `POST /vehicles/:id/takeover`: assign an operator
- `POST /vehicles/:id/release`: release the requesting operator's assignment

Other endpoints:

- `GET /operators`: list the seeded operators
- `GET /health`: service health

Create or update payload:

```json
{
  "code": "FLEET-512",
  "name": "Atlas 512",
  "isOnline": true
}
```

Takeover or release payload:

```json
{
  "operatorId": "669e8c5a3a822b37b775a001"
}
```

Vehicle response:

```json
{
  "id": "669e8cb53a822b37b775a010",
  "code": "FLEET-512",
  "name": "Atlas 512",
  "isOnline": true,
  "assignedOperatorId": null,
  "createdAt": "2026-07-20T12:00:00.000Z",
  "updatedAt": "2026-07-20T12:00:00.000Z"
}
```

Validation and rule failures use a consistent response:

```json
{
  "statusCode": 409,
  "error": "CONFLICT",
  "message": "Assigned vehicle must be released before it can go offline",
  "path": "/api/vehicles/669e8cb53a822b37b775a010",
  "timestamp": "2026-07-20T12:05:00.000Z"
}
```

Expected status codes are `200` for reads and actions, `201` for creation,
`204` for deletion, `400` for malformed input, `404` for missing resources,
and `409` for business-rule conflicts.

## Business rules and consistency

Business rules live in the API services, not in the controllers or frontend:

- Only online, unassigned vehicles can be taken over.
- An operator can hold at most one vehicle.
- A vehicle can have at most one operator.
- Assigned vehicles cannot go offline.
- Only the assigned operator can release a vehicle.
- Assigned vehicles cannot be deleted.

The assignment is stored on the vehicle document. Takeover, release, and
offline updates use conditional `findOneAndUpdate` operations, so competing
requests cannot both pass a read-then-write check. A unique partial index on
`assignedOperatorId` prevents concurrent requests from assigning the same
operator to different vehicles. MongoDB duplicate-key failures are translated
to a clear `409 Conflict`.

## Checks

```bash
npm test
npm run lint
npm run build
npm run test:e2e --workspace @fleet/api
```

The focused assignment service tests cover the atomic takeover filter, offline
rejection, unique-index conflict mapping, and owner-only release. The HTTP
integration test uses the running MongoDB container.

At the time of implementation, `npm audit` reports two moderate entries for
the same PostCSS advisory through the latest stable Next.js release. npm's
suggested automatic fix is an unsafe major downgrade of Next.js. There are no
high or critical findings, so the supported framework version is retained
until an upstream stable release updates its pinned PostCSS dependency.

## Decisions and future growth

- Authentication is omitted as requested; the operator ID identifies the
  caller.
- Vehicle and operator codes are unique stable identifiers, while MongoDB IDs
  are used in API paths and relationships.
- Deleting an assigned vehicle is rejected instead of implicitly releasing it.
- The API returns direct resource objects and a consistent error object rather
  than adding an envelope that this small service does not need.

For a larger fleet, the next steps would be authenticated operator identity and
role checks, cursor pagination, audit events for every assignment transition,
observability around conflict rates, and database-backed integration tests for
concurrency. If assignment behavior later spans several documents, MongoDB
transactions on a replica set or a dedicated assignment aggregate would keep
the operation atomic.
