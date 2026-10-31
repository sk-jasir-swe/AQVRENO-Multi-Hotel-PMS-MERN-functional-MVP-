# AQVRENO — Multi-Hotel PMS (MERN functional MVP)

AQVRENO is a multi-tenant hotel-management SaaS starter built with MongoDB, Express, React and Node.js. The dashboard follows the approved modern light SaaS design. See `docs/approved-dashboard-design.png` and `docs/FEATURES-AND-STATUS.md`.

## Included

- Hotel owner registration creates a hotel tenant.
- Login/logout using JWT in an HttpOnly cookie.
- Super-admin role and hotel approval/status management (seed an admin).
- Tenant-scoped rooms, guests and bookings CRUD APIs.
- Dashboard summary and recent reservations.
- Responsive React dashboard with sidebar, KPI cards, room/booking tables and forms.
- Room status, booking status and check-in/check-out actions.
- Booking calendar, front-desk arrivals/in-house/departures, and guest stay history.
- Manual payment records/refunds, printable invoices, configurable GST calculation (0% default).
- Date-filtered operational reports, staff roles, housekeeping tasks, CSV exports, and in-app notices.
- Hotel owner and staff support requests with threaded replies and a super-admin inbox showing reporter, hotel, and owner details.
- Plan-based room and staff limits, tenant-scoped activity history, guest check-in ID-type/last-four consent records, configurable cancellation/refund eligibility, daily payment reconciliation, and occupancy/ADR/no-show reporting.
- Room-linked restaurant orders available to hotel staff, printable bills, owner/manager order attribution and date-filtered CSV export, a configurable menu, stock adjustments, low-stock warnings, and owner/manager-only income summaries for served orders.
- Owner backup downloads with hotel-bound validation, preview, and non-overwriting restore.
- Optional guest email and consent-based MSG91 SMS reminders; SMTP/MSG91 credentials are configured by the operator.
- Manually administered subscription plans and hotel subscription records (no automatic charges).
- Owner-only tenant JSON backup downloads and manually confirmed, additive restores.
- Cancellation policy defaults to a 24-hour cutoff and 100% eligible refund before that cutoff; owners can change both values.

## Server code layout

`server/src/routes/api.routes.js` composes the domain route modules in `server/src/routes/`. Route files use the `*.routes.js` suffix and controllers use the matching `*.controller.js` suffix; each route module connects its endpoints to its domain controller.

## Requirements

- Node.js 20+
- MongoDB Atlas or local MongoDB

## Setup

1. Copy `server/.env.example` to `server/.env` and set the MongoDB URI, strong JWT secret, client URL and super-admin seed credentials.
2. From project root run `npm install`.
3. Run `npm run install:all`.
4. In `server`, run `npm run seed:admin` to create the initial super-admin.
5. From project root run `npm run dev`.
6. Frontend: `http://localhost:5173`; API: `http://localhost:5001/api`. Authentication cookies are Secure-only; use HTTPS for local environments where the browser does not permit Secure cookies on localhost.

Change the seeded super-admin password immediately. Never commit `.env` files.

## Deployment notes

Deploy the API and client separately. Configure `VITE_API_URL` to the deployed API base ending in `/api`; configure server `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `NODE_ENV=production`, and seed credentials. Authentication cookies always use the Secure attribute and are only sent over HTTPS; configure HTTPS and correctly configured CORS.

SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`) enable guest email. Consent-based SMS requires MSG91 `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, and `MSG91_SENDER_ID`; optionally set `MSG91_FLOW_URL`. Keep credentials only in the local server environment. Invoice GST is a configurable software calculation and is not tax or accounting advice.

## Important scope statement

This is a functional MVP foundation, **not a complete commercial/enterprise PMS and not ready to sell to hotels as-is**. Restaurant workflows and inventory controls are basic and are not a full POS/procurement system. Jurisdiction-compliant tax/accounting, live payment/subscription processing, OTA/channel-manager sync, public booking engine, automated backups, monitoring, and comprehensive security/integration/load testing are not complete. See `docs/FEATURES-AND-STATUS.md`. Do not put real guest/payment data into production until these launch gates are completed and verified.
