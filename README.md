# HelloCare Consulting — Email Client

Internal tool: upload a client CSV, compose a personalised email, send it from one of
three authorised `@hellocareconsulting.com` mailboxes, and review the delivery log.

## Stack

- **Backend:** Node.js/Express/TypeScript, Sequelize + PostgreSQL, JWT auth (access
  token in memory on the client, refresh token as an httpOnly cookie), Nodemailer over
  SMTP.
- **Frontend:** React + TypeScript + Vite + Tailwind, using HelloCare's real navy/gold
  brand tokens.
- **Deploy:** one Docker image (`Dockerfile`) serving both, on Render (`render.yaml`),
  mirroring the pattern already used for the Paleon Training app.

This is a brand-new project — there was no existing backend for HelloCare Consulting to
integrate with (the marketing site is static HTML on cPanel with no server at all), so a
small, self-contained app was the appropriate choice per the brief.

## Local development

```bash
cp backend/.env.example backend/.env   # fill in SMTP_HOST/PORT and the 3 mailbox passwords
docker compose up
```

- Backend: http://localhost:4100
- Frontend: http://localhost:5174 (proxies `/api` to the backend)

Create your first login (there is no public sign-up — see Security below):

```bash
cd backend
npm run create-user -- "you@hellocareconsulting.com" "a strong password" "Your Name"
```

## Sender accounts

Fixed in `backend/src/config/index.ts` (`SENDER_ACCOUNTS`), not editable via the UI or
database — the three accounts are:

- `info@hellocareconsulting.com`
- `ken.uwotu@hellocareconsulting.com`
- `Isabella.chao@hellocareconsulting.com`

Each authenticates over SMTP as **itself**, using its own real cPanel mailbox password
(`SMTP_PASS_INFO` / `SMTP_PASS_KEN` / `SMTP_PASS_ISABELLA`). This is not a shared mailbox
with aliasing — the app can never send "from" an address it doesn't hold real,
independently-verified credentials for, which is what rules out spoofing. To add a fourth
account, edit that array and deploy — deliberately a code change, not a settings toggle.

**Before this can send real mail:** get the exact SMTP host/port from InMotion/cPanel
(Email Accounts → Connect Devices) and each mailbox's own password, and set them as
environment variables (see `.env.example` / `render.yaml`). Also worth checking with
InMotion that SPF/DKIM are set up correctly for `hellocareconsulting.com` — without them,
mail sent via SMTP auth as these mailboxes may land in recipients' spam folders even
though the send itself succeeds.

## Security notes

- No public registration route — accounts are created only via `npm run create-user`.
- Passwords hashed with bcrypt; access tokens are short-lived JWTs kept in memory on the
  frontend (never localStorage); the refresh token is the only credential in a cookie,
  and it's httpOnly + `SameSite=Strict`, which is this app's whole CSRF defence (every
  other request needs an `Authorization` header a cross-site request can't attach).
- CSV uploads are parsed in memory only (multer memory storage) — nothing is ever
  written to disk, so there's no temporary file to clean up.
- HTML personalisation values (`{{first_name}}` etc., pulled from the uploaded CSV) are
  HTML-escaped before merging into the email body, so a malicious CSV cell can't inject
  markup. The admin's own HTML template text is never escaped.
- Sending is rate-limited (20 send/test actions per hour) separately from login (10
  attempts per 15 minutes).
- Every login attempt, upload, test send, and confirmed send is written to `audit_logs`
  — never a password, token, or SMTP credential.
- Confirming a send is guarded by an atomic `draft -> sending` DB update, so a
  double-click or a duplicate form submission can only ever trigger one real send.

## Deploying

```bash
render blueprint launch   # or apply render.yaml from the Render dashboard
```

Then, in the Render dashboard for the new service, set `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE`, and the three `SMTP_PASS_*` values (left as `sync: false` in
`render.yaml` so they're never committed to git). Run `npm run create-user` against the
production database (e.g. via Render's shell) to create the first real login.
