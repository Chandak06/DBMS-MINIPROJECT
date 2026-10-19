# Authentication and Authorization

The application uses signed, eight-hour JWT sessions in an HTTP-only cookie. HS256 verification restricts the algorithm; SESSION_SECRET must contain at least 32 characters. Google sign-in uses a random ten-minute state cookie, verifies provider email verification, and maps the normalized email to an existing MySQL USER. The provider cannot choose the application role.

Each authenticated request refreshes the role from MySQL, so a stale cookie cannot preserve a changed role. Profile validation rejects role fields. An admin can register Google users; staff/admin can manage reference data and decisions. Students access their own lost reports, matches, claims and notifications. Found item descriptions support browsing; private remarks, flexible identifying attributes and media remain restricted.

The optional local demo selects only three explicitly seeded accounts. It requires DEMO_LOGIN_ENABLED=true and a local APP_BASE_URL; the delivered npm servers bind to 127.0.0.1. Set the flag to false when exposing the application beyond a local demonstration.

Mutating API requests reject cross-origin Origin headers and cross-site browser fetches. Cookies use SameSite=Lax and production Google sessions use Secure. Use HTTPS and a restricted database account in deployment. Configuration and secrets belong in the ignored .env.local, never source control. There is no stored application password.

A claim requires an accepted match belonging to the claimant. Staff cannot process their own claim. SQL role triggers and procedures enforce reviewers/processors, unique indexes prevent multiple accepted pairs or approved claims, and terminal decisions cannot be reversed through the APIs.

Provider-backed Google authentication is implemented but requires valid credentials owned by the team. Local demo authentication, role isolation, tampered-session rejection and callback state checks are part of local verification; no claim is made that a real Google consent flow was completed.
