# AQVRENO — Multi-Hotel PMS (MERN functional MVP)

AQVRENO is a multi-tenant hotel-management SaaS starter built with MongoDB, Express, React and Node.js. The dashboard follows the approved modern light SaaS design. See `docs/approved-dashboard-design.png` and `docs/FEATURES-AND-STATUS.md`.

## Included

- Hotel owner registration creates a hotel tenant.
- Login/logout using 15-minute JWT access cookies and rotating 7-day refresh sessions, with per-session and all-session revocation.
- Email-verified self-service password reset links for admins, hotel owners and staff; links expire after 30 minutes and reset revokes active sessions.
- Authenticated profile page available to every role, with current-password verified changes that revoke other active sessions.
- Super-admin role and hotel approval/status management (seed an admin).
- Tenant-scoped rooms, guests and bookings CRUD APIs.
- Dashboard summary and recent reservations.
- Responsive React dashboard with sidebar, KPI cards, room/booking tables and forms.
- Room status, booking status and check-in/check-out actions.
- Date-based room maintenance blocks prevent reservations from overlapping planned work; reservation status history shows who changed a booking and when.
- Booking calendar, front-desk arrivals/in-house/departures, and guest stay history.
- Manual payment records/refunds, printable invoices, configurable GST calculation (0% default).
- Date-filtered operational reports, staff roles, housekeeping tasks, CSV exports, and in-app notices.
- Hotel owner and staff support requests with threaded replies and a super-admin inbox showing reporter, hotel, and owner details.
- Plan-based room and staff limits, tenant-scoped activity history, guest check-in ID-type/last-four consent records, configurable cancellation/refund eligibility, daily payment reconciliation, and occupancy/ADR/no-show reporting.
- Room-linked restaurant orders available to hotel staff, printable bills, owner/manager order attribution and date-filtered CSV export, a configurable menu, stock adjustments, low-stock warnings, and owner/manager-only income summaries for served orders.
- Owner backup downloads with hotel-bound validation, preview, and non-overwriting restore.
- Automated check-in, check-out and outstanding-payment reminders, with optional guest email and consent-based MSG91 SMS; SMTP/MSG91 credentials are configured by the operator.
- Manually administered subscription plans and hotel subscription records (no automatic charges).
- Owner-only tenant JSON backup downloads and manually confirmed, additive restores.
- Weekly in-app reminders tell hotel owners when a manual backup download is overdue; backups are not generated automatically.
- Cancellation policy defaults to a 24-hour cutoff and 100% eligible refund before that cutoff; owners can change both values.

## Server code layout

`server/src/routes/api.routes.js` composes the domain route modules in `server/src/routes/`. Route files use the `*.routes.js` suffix and controllers use the matching `*.controller.js` suffix; each route module connects its endpoints to its domain controller.

Hotel data uses shared MongoDB collections, with each hotel-owned document associated with a hotel ID. Authenticated requests use the hotel ID from the validated user session to scope hotel data queries.

## Requirements

- Node.js 20+
- MongoDB Atlas or local MongoDB

## Setup

1. Copy `server/.env.example` to `server/.env` and set the MongoDB URI, strong JWT secret, client URL and super-admin seed credentials.
2. Install dependencies in each app: `npm --prefix server install` and `npm --prefix client install`.
3. From the project root, run `npm --prefix server run seed:admin` to create the initial super-admin.
4. Start the API and client in separate terminals: `npm --prefix server run dev` and `npm --prefix client run dev`.
5. Frontend: `http://localhost:5173`; API: `http://localhost:5001/api`. Authentication cookies are HttpOnly; they use SameSite=Lax without Secure in development and SameSite=None with Secure in production.

Change the seeded super-admin password immediately. Never commit `.env` files.

## Deployment notes

Deploy the API and client separately. On Vercel, set `VITE_API_URL` to the deployed API base ending in `/api` (for example, `https://aqvreno-multi-hotel-pms-mern-functional.onrender.com/api`) and redeploy after changing environment variables. On Render, set `CLIENT_URL` to the exact Vercel site origin (for example, `https://your-site.vercel.app`, without a trailing slash); multiple allowed origins can be comma-separated. Also configure server `MONGO_URI`, a strong `JWT_SECRET`, `NODE_ENV=production`, and seed credentials. The frontend defaults to the AQVRENO Render API in production if `VITE_API_URL` is unset. In production, authentication cookies use SameSite=None and Secure and require HTTPS; CORS must allow the Vercel origin. Run the server auth tests with `cd server && JWT_SECRET=<test-secret> MONGO_URI=mongodb://127.0.0.1:27017/staypro_test NODE_ENV=test npm test`.

SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`) enable guest email and password recovery. Configure a verified sender in `MAIL_FROM`; set both `SMTP_USER` and `SMTP_PASS` when your provider requires authentication. The reset email link uses the first origin in `CLIENT_URL`. Consent-based SMS requires MSG91 `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, and `MSG91_SENDER_ID`; optionally set `MSG91_FLOW_URL`. Keep credentials only in the local server environment. Invoice GST is a configurable software calculation and is not tax or accounting advice.

## Important scope statement

This is a functional MVP foundation, **not a complete commercial/enterprise PMS and not ready to sell to hotels as-is**. Restaurant workflows and inventory controls are basic and are not a full POS/procurement system. Jurisdiction-compliant tax/accounting, live payment/subscription processing, OTA/channel-manager sync, public booking engine, automatic server-generated backups (reminders are provided, but downloads remain manual), monitoring, and comprehensive security/integration/load testing are not complete. See `docs/FEATURES-AND-STATUS.md`. Do not put real guest/payment data into production until these launch gates are completed and verified.
