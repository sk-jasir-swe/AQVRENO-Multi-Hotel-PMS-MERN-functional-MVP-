# AQVRENO feature and delivery status

## Included in this ZIP (functional MVP foundation)

- Multi-tenant hotel registration and tenant-scoped data access
- Login/logout with HttpOnly, Secure-only cookie authentication (HTTPS required)
- New hotel-owner and staff accounts require a Gmail address and a password with at least 8 characters, one uppercase letter, and one special character
- Super-admin seeded account and hotel approval/status controls
- Hotel dashboard with summary metrics and recent reservations
- Rooms, guests and reservations CRUD endpoints and UI
- Booking status updates including check-in/check-out workflow
- Reservation status history with staff member, timestamp and before/after status
- Hotel-scoped room maintenance date blocks that prevent overlapping reservations
- Responsive light SaaS dashboard UI based on the approved mockup
- Booking calendar, front desk workflow and guest stay history
- Manually recorded booking payments/refunds and printable invoices
- Hotel GST calculation setting (0% default); not a tax-compliance determination
- Date-ranged occupancy, average daily rate, cancellation/no-show, revenue and payment reconciliation reports; staff accounts/roles and housekeeping tasks
- In-app booking notices, check-in/check-out and outstanding-payment reminders, optional email and consent-based MSG91 SMS
- Threaded support requests/replies between hotel users and super-admin
- Plan-based room and staff limits plus a hotel-scoped activity log
- Guest check-in records ID type and last four digits with consent; guest creation can additionally store a consented Aadhaar, PAN or passport number, encrypted at rest and excluded from normal guest API responses
- Configurable cancellation cutoff and refund percentage with manually recorded, capped refunds
- Housekeeping assignment/completion in-app notifications
- Restaurant menu and staff order placement with explicit table/room service, checked-in room guest details, printable bills, restaurant-only configurable GST snapshots, owner/manager order attribution and date-filtered CSV exports, served-order income summaries, order status and adjustable stock with low-stock warnings
- Owner-only tenant backup downloads and validated, previewed, additive restore; weekly server-side in-app reminders for overdue manual downloads
- Hotel owner-only staff activity and subscription management; owner/manager restaurant income date filters with served-order CSV export

## Not included / not safe to sell as complete yet

- Full restaurant POS, kitchen display, inventory procurement and supplier management
- Jurisdiction-compliant invoice/accounting workflows and credit notes
- Live payment/subscription processing, webhook reconciliation and automated charges
- OTA/channel-manager integrations
- Public booking engine with payment capture and cancellation policies
- MFA and comprehensive audit coverage across every operation
- Automatic server-generated backup scheduling, independent restore verification, monitoring, load/security testing

## Commercial launch gate

Do not onboard real hotels or process real guest/payment data until the missing modules are implemented, integrations are configured with merchant credentials, and independent security, privacy, tax/accounting, backup-restore and end-to-end tests are completed.
