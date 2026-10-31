# Commercial readiness status

This ZIP preserves the agreed client/server folder layout and includes a functional MVP foundation plus explicit module entry points. It is **not yet a complete commercial PMS**. Do not onboard paying hotels or process real guest/payment data until the items below are implemented and independently tested.

## Working foundation

- MERN app, authentication, hotel registration, approval workflow.
- Tenant-scoped core resources in the existing API.
- Responsive modern SaaS dashboard shell matching the approved visual direction.
- Hotel/room/guest/booking model foundation and room-overlap service.
- Additional model and module entry points for billing, subscriptions, housekeeping, restaurant orders and inventory.

## Required before commercial launch

- Implement and test all module CRUD/business workflows and connect every page to its API.
- Add strict schema validation for every endpoint, authorization matrix tests and tenant-isolation penetration tests.
- Implement refresh-token rotation/revocation, password reset, MFA option, audit trails and account recovery.
- Implement Razorpay orders, signed webhooks, idempotency, refunds, reconciliation and subscription lifecycle.
- Implement GST invoice rules with accountant review; tax treatment depends on property and transaction details.
- Implement booking-engine availability locking, payment confirmation, cancellation/refund policies and email delivery.
- Implement restaurant kitchen workflow, inventory procurement, housekeeping assignments, staff shifts and reporting.
- Add automated unit/integration/e2e tests, backups plus restore drills, monitoring, alerting, privacy/retention controls and security review.
- Configure real provider credentials, HTTPS, production CORS/cookies, domain, deployment and incident response.

The module entry-point files are not evidence that those workflows are complete.
