# ChauffIQ — Master Project Status Report
> **Current Status:** 🚀 **LIVE IN PRODUCTION & FULLY VERIFIED**  
> **Last Updated:** 2026-09-07 · **Active Firebase Project:** `chauffiq-a0366` · **Cloud Region:** `asia-southeast1` (Singapore)

---

## 1. Executive Status Dashboard

| Dimension | Status | Key Details |
|---|:---:|---|
| **Live Web App** | 🟢 **ACTIVE** | Hosted at [chauffiq-a0366.web.app](https://chauffiq-a0366.web.app) (React 19 + Vite 8) |
| **Backend API** | 🟢 **ACTIVE** | 29 Cloud Functions v2 in `asia-southeast1` with CORS, Secret Manager, FCM, Ratings, Payments & Admin APIs |
| **Cloud Firestore** | 🟢 **ACTIVE** | Native Mode `(default)` in `asia-southeast1` with `/admins` collection shielding |
| **Security Rules** | 🟢 **ENFORCED** | Default-deny, direct client write blocking (including `/ratings`, `/payments` & `/admins`), verified owner read access |
| **Authentication** | 🟢 **VERIFIED** | Google Identity Toolkit + Secret Manager `WEB_API_KEY` + Firebase Custom Claims |
| **Client SDK** | 🟢 **TESTED** | Framework-agnostic client (`client/`) with PaymentsApi and AdminApi modules |
| **Push Notifications**| 🟢 **LIVE** | Web Push & Admin SDK Multicast FCM (`firebase-messaging-sw.js` deployed) |
| **Ratings & Feedback**| 🟢 **LIVE** | Two-sided post-trip ratings (1-5★), deterministic IDs, server-authoritative aggregates |
| **Payment Sandbox** | 🟢 **SANDBOX** | Test-mode payments, server-authoritative fares, integer minor units (paise), idempotent state machine |
| **Admin Dashboard** | 🟢 **LIVE** | Server-authoritative admin authorization, operational telemetry, read-only ride inspection |
| **Regression Tests** | 🟢 **100% PASS** | 35 ph14 + 28 ph13 + 31 ph12 + 24 ph11 + 22 ph10 + 13 ph9 + 16 ph8 + 16 FCM + 15 workflow + 13 client + 9 phone auth |
| **Code Quality** | 🟢 **CLEAN** | ESLint: 0 errors/warnings · Vite: builds in ~348ms |

---

## 2. Production URLs & Infrastructure References

- **Production Frontend:** [https://chauffiq-a0366.web.app](https://chauffiq-a0366.web.app)
- **Functions Base URL:** `https://asia-southeast1-chauffiq-a0366.cloudfunctions.net`
- **Firebase Console:** [https://console.firebase.google.com/project/chauffiq-a0366/overview](https://console.firebase.google.com/project/chauffiq-a0366/overview)
- **Billing Tier:** Blaze (Pay-as-you-go) — Cloud Run & Secret Manager enabled
- **Local Emulator Suite:** Fully supported on ports `5001` (functions), `8080` (firestore), `9099` (auth), `9000` (database), `4000` (ui)

---

## 3. Detailed Chronological Progress (Phases 1 – 6B)

```
[Phase 1: Discovery & Assessment] 
       │
[Phase 2A & 2B: Backend Hardening] ──► [Phase 2C: getRide Endpoint]
       │
[Phase 2D: Firestore Security Rules] ──► [Phase 2E: Regression Testing]
       │
[Phase 3: Client SDK Contract] ──► [Phase 4: React 19 Frontend App]
       │
[Phase 5 & 5B: Production Readiness] ──► [Phase 6A: Cloud Init]
       │
[Phase 6B: Production Deployment & Bug Fixes] ──► ✅ PRODUCTION LIVE
```

### Phase 1 — Project Assessment & Discovery
- Audited the initial codebase, Firebase configuration, and Cloud Functions v2 exports.
- Identified and corrected the project ID discrepancy in `.firebaserc` (`chauffiq-a0366`).
- Documented initial 12 functions, parameters, and database operations in `chauffiq_assessment.md`.

### Phase 2A & 2B — Backend Security Hardening & Auth Middleware
- **Backup Created:** `functions/index.js.backup-pre-phase2`.
- **`AuthError` & `verifyToken(req)`:** Created strict Bearer token verification using `auth.verifyIdToken(idToken)`. Decodes caller UID and protects against forged request bodies.
- **Identity & Role Enforcement:** Eliminated UID spoofing across `createDriver`, `createRide`, `updateDriverLocation`, `updateDriverAvailability`, `createFamilyMonitoring`, and `createNotification`.
- **Ride State Machine:** Implemented strict forward-only transition rules (`VALID_TRANSITIONS`):
  - `REQUESTED` ➔ `ACCEPTED` / `CANCELLED`
  - `ACCEPTED` ➔ `ARRIVING` / `CANCELLED`
  - `ARRIVING` ➔ `STARTED` / `CANCELLED`
  - `STARTED` ➔ `COMPLETED`
- **Geographic Validation:** Added strict finite number and coordinate boundary checks for latitude `[-90, 90]` and longitude `[-180, 180]`.

### Phase 2C — `getRide` Implementation & Multi-Role Authorization
- Implemented `exports.getRide` (HTTP GET) protected by `verifyToken()`.
- Implemented 3-tier authorization matrix:
  1. **Passenger:** `ride.passengerId === callerUid`
  2. **Assigned Driver:** `ride.driverId === callerUid`
  3. **Authorized Family Member:** active document in `familyMonitoring` where `rideId == rideId && familyMemberId == callerUid`
- Unauthorized callers receive HTTP 403 (`"You do not have access to this ride"`). Missing rides return HTTP 404.

### Phase 2D — Production Firestore Security Rules
- Replaced the temporary open-until-expiry rule (`allow read, write: if request.time < ...`) with production-grade `firestore.rules`.
- Implemented **default-deny** (`match /{document=**} { allow read, write: if false; }`).
- Blocked **all direct client writes** (`allow write: if false;`) across all collections, ensuring data integrity through Cloud Functions Admin SDK.
- Configured secure read permissions:
  - `users/{uid}`: Read restricted to authenticated owner (`request.auth.uid == uid`).
  - `drivers/{uid}`: Read open to authenticated users for driver discovery.
  - `rides/{rideId}`: Read restricted to passenger, assigned driver, or verified family member.
  - `tracking/{rideId}`: Location read restricted to participants of the ride.
  - `familyMonitoring/{docId}`: Read restricted to passenger or assigned family monitor.
  - `notifications/{docId}`: Read restricted to recipient user.

### Phase 2E — Comprehensive Security & Regression Verification
- Tested against a clean Firebase emulator session.
- **58/58 tests passed** covering all 12 Cloud Functions, token invalidation, status progression, cross-user hijacking prevention, coordinate boundary tests, and Firestore rule assertions.
- ESLint: 0 errors, 0 warnings.

### Phase 3 — API Client SDK & Specification
- Authored complete [api_contract.md](file:///C:/Users/venky/.gemini/antigravity/brain/4876ed04-832a-41eb-b903-9ebe29cf7923/api_contract.md) documenting all 13 Cloud Functions.
- Built framework-agnostic JavaScript SDK (`client/`):
  - `httpClient.js`: Standard `fetch` transport with automatic `Authorization: Bearer <token>` injection.
  - `tokenManager.js`: In-memory token management preventing token leakage.
  - `errors.js`: Structured `ApiClientError`.
  - Domain modules: `auth`, `drivers`, `rides`, `tracking`, `family`, `notifications`.
- Developed `test_client_integration.js`: **13/13 tests passed**.

### Phase 4 — React 19 + Vite 8 Web Application
- Built modern single-page application in [`frontend/`](file:///C:/Users/venky/Documents/ChauffIQ/frontend):
  - **Framework:** React 19 (`v19.2.8`) + Vite 8 (`v8.2.2`).
  - **Context:** `AuthContext.jsx` with persistent session state and zero token exposure.
  - **Components:** `Navbar.jsx`, `Alert.jsx`.
  - **Pages:**
    - `AuthPage.jsx`: Unified Login and Register with role selection.
    - `PassengerDashboard.jsx`: Book rides, track driver location, authorize family monitors, cancel rides.
    - `DriverDashboard.jsx`: Register driver profile, toggle online/offline availability, accept rides, advance ride statuses, broadcast GPS location.
    - `FamilyMonitoringPage.jsx`: Real-time tracking portal for authorized family members.
- Developed `test_frontend_workflow.js`: **15/15 tests passed**.

### Phase 5 & 5B — Production Readiness Audit & Pre-Deployment Hardening
- Added Firebase Hosting configuration with SPA rewrites to `firebase.json`.
- Configured Cloud Functions v2 CORS (`cors: true`) to support cross-origin browser requests.
- Integrated `WEB_API_KEY` secret parameter declaration for Google Identity Toolkit.
- Created `frontend/.env.production` pointing to live Cloud Functions URL.
- Verified dual-environment compatibility (switches automatically between local emulator and cloud production).

### Phase 6A — Cloud Infrastructure Initialization
- Confirmed active project `chauffiq-a0366` in `asia-southeast1`.
- Provisioned Cloud Firestore Native mode database `(default)` in `asia-southeast1`.
- Upgraded project to Blaze plan to unlock Cloud Functions v2 (Cloud Run) and Secret Manager.

### Phase 6B — Production Deployment, Diagnostics & Live Resolution
- **Initial Deploy:** Deployed all 13 Cloud Functions and Hosting.
- **Issue 1 Diagnosed & Fixed (Phone Handling):**
  - *Problem:* Registration sent local phone numbers (e.g., `7287882526`) to `auth.createUser()`, violating E.164 requirements and crashing with HTTP 500 (`"Server error. Please try again later."`).
  - *Fix:* In `functions/index.js`, omitted `phoneNumber` when empty; validated non-empty phone against `/^\+[1-9]\d{1,14}$/`; caught `auth/invalid-phone-number` and returned HTTP 400 Bad Request.
- **Issue 2 Diagnosed & Fixed (Web API Key Binding):**
  - *Problem:* Production login failed with `"API key not valid. Please pass a valid API key."`.
  - *Fix:* Bound Secret Manager secret explicitly using `defineSecret("WEB_API_KEY")` and `rawOnRequest({ cors: true, secrets: [webApiKey] }, ...)`. Added defensive stripping of surrounding quotes and whitespace.
- **Redeployments Executed:**
  - `firebase deploy --only functions:login` (Successful)
  - `firebase deploy --only functions:register` (Successful)
  - `firebase deploy --only hosting` (Successful)
- **Live Verification:** Executed live production probe and E2E tests:
  - Unknown user probe returned `INVALID_LOGIN_CREDENTIALS` (verifying Identity Toolkit validates the key).
  - Invalid phone register returned HTTP 400 with E.164 error message.
  - Empty phone register returned HTTP 201 Created.
  - Login with registered user returned HTTP 200 with tokens and profile.
  - Valid E.164 phone register returned HTTP 201 Created.

### Phase 7A — Native Firebase Phone Authentication & SMS OTP
- **Native Web Flow:** Integrated official Firebase Web Auth SDK (`signInWithPhoneNumber`, `RecaptchaVerifier`, `ConfirmationResult.confirm`) rather than custom OTP generators or Firestore storage.
- **Backend Authorization & Profile Sync (`exports.syncUser`):** Deployed dedicated `syncUser` Cloud Function in `asia-southeast1`. Validates Firebase Phone ID tokens via `verifyToken(req)`, derives user identity strictly from `decodedToken.uid`, and syncs Firestore profile.
- **Frontend Dual-Mode Authentication:** Updated `AuthPage.jsx` and `AuthContext.jsx` to seamlessly support both Email & Password and Phone SMS OTP with invisible reCAPTCHA.
- **Zero Regressions:** 100% backward compatibility preserved for existing email/password login and registration.

### Phase 7B — Firebase Cloud Messaging (FCM) Push Notifications
- **Admin SDK Multicast & Automatic Dead-Token Pruning:** Integrated `firebase-admin/messaging` via `sendPushNotificationToUser(userId, payload)` supporting multi-token dispatch and automatic deletion of invalid or unregistered tokens.
- **Token Registration Endpoint (`exports.registerFcmToken`):** Deployed endpoint supporting `POST` (register) and `DELETE` (unregister) under `users/{userId}/fcmTokens/{tokenId}` using deterministic SHA-256 token hashing.
- **Lifecycle Push Triggers:** Hooked into `createNotification` and `updateRideStatus` transitions (`ACCEPTED`, `ARRIVING`, `STARTED`, `COMPLETED`, `CANCELLED`).
- **Web Push Service Worker (`firebase-messaging-sw.js`):** Built and deployed at root URL (`https://chauffiq-a0366.web.app/firebase-messaging-sw.js`) for background push handling.
- **Frontend Permission & Foreground Alerting:** Integrated notification bell toggle and foreground toast banner in `Navbar.jsx` with completely non-blocking UX.

---

## 4. Current Architecture & Cloud Functions Registry

All 15 Cloud Functions are 2nd Gen HTTPS endpoints executing in Node.js 24 in `asia-southeast1`:

| # | Endpoint | Method | Auth Required | Purpose | Status |
|---|---|:---:|:---:|---|:---:|
| **1** | `/hello` | ANY | No | Health check stub | 🟢 Live |
| **2** | `/register` | POST | No | Register user in Auth & Firestore (E.164 validated) | 🟢 Live |
| **3** | `/login` | POST | No | Authenticate via Identity Toolkit & Secret Manager key | 🟢 Live |
| **4** | `/createDriver` | POST | Bearer Token | Onboard driver profile linked to verified UID | 🟢 Live |
| **5** | `/getAvailableDrivers`| GET | Bearer Token | Query active, available drivers | 🟢 Live |
| **6** | `/updateDriverAvailability` | POST | Bearer Token | Toggle driver availability status | 🟢 Live |
| **7** | `/createRide` | POST | Bearer Token | Passenger requests ride | 🟢 Live |
| **8** | `/getRide` | GET | Bearer Token | Retrieve ride (Passenger, Driver, or Family) | 🟢 Live |
| **9** | `/updateRideStatus` | POST | Bearer Token | Advance ride through state machine transitions | 🟢 Live |
| **10**| `/updateDriverLocation` | POST | Bearer Token | Driver broadcasts GPS coordinates | 🟢 Live |
| **11**| `/getDriverLocation` | GET | Bearer Token | Authorized tracking for passenger or family | 🟢 Live |
| **12**| `/createFamilyMonitoring` | POST | Bearer Token | Passenger authorizes family member to track | 🟢 Live |
| **13**| `/createNotification` | POST | Bearer Token | Create user notification (with FCM push dispatch) | 🟢 Live |
| **14**| `/syncUser` | POST | Bearer Token | Onboard / sync phone-authenticated user in Firestore | 🟢 Live |
| **15**| `/registerFcmToken` | POST / DELETE | Bearer Token | Register or unregister device FCM push token | 🟢 Live |

---

## 5. Firestore Data Model & Ownership Mapping

| Collection | Key Identifier | Ownership / Access Control | Written By |
|---|---|---|---|
| `users` | `uid` (Auth UID) | Owner read only; direct client write forbidden | `register`, `createDriver`, `syncUser` |
| `users/{uid}/fcmTokens` | `tokenId` (SHA-256) | Owner read only; direct client write forbidden | `registerFcmToken`, `sendPushNotificationToUser` |
| `drivers` | `uid` (Auth UID) | Authenticated read; direct client write forbidden | `createDriver`, `updateDriverAvailability` |
| `rides` | Auto ID | Participant read only; forward-only state machine | `createRide`, `updateRideStatus` |
| `tracking` | `rideId` | Assigned driver write; passenger & family read | `updateDriverLocation` |
| `familyMonitoring`| Auto ID | Passenger or assigned family member read | `createFamilyMonitoring` |
| `notifications` | Auto ID | Target user read only | `createNotification` |

---

### Phase 8 — Live Ride Tracking (Completed)
- Integrated 10-second driver GPS broadcast via browser Geolocation API.
- Implemented 8-second passenger driver location polling with Google Maps "View Driver on Map" integration.
- Enforced strict terminal-state cleanup (tracking stops on COMPLETED/CANCELLED and unmount).
- Production integration test suite: 16/16 PASSED (`test_phase8.js`).

### Phase 9 — Driver & Passenger Complete UX (Completed)
- **Passenger Ride Lifecycle UI:** Complete visual stepper (REQUESTED ➔ ACCEPTED ➔ ARRIVING ➔ STARTED ➔ COMPLETED) with accessible labels and icons.
- **Driver Profile Enrichment:** `getRide` & `updateRideStatus` enriched with driver name, vehicle registration number, model, and rating from Firestore.
- **Double-Submission Protection:** All passenger and driver actions (Accept, Start, Complete, Cancel, Create) disabled with spinners during in-flight API requests.
- **Accessible & Responsive Design:** ARIA attributes, semantic headings, copy-to-clipboard buttons, mobile-friendly touch targets, and focus-visible rings.
- **Error Handling:** User-friendly messages for network errors, timeouts, permission issues, and unauthorized attempts (zero raw stack traces exposed).
- **Test Suites:**
  - `test_phase9.js`: 13/13 PASSED (Production)
  - `test_phase8.js`: 16/16 PASSED (Production)
  - `test_phone_auth.js`: 9/9 PASSED (Emulator)
  - `test_client_integration.js`: 13/13 PASSED (Emulator)
  - `test_fcm.js`: 16/16 PASSED (Emulator)
  - `test_frontend_workflow.js`: 15/15 PASSED (Emulator)
- **Production Deployment:** Cloud Functions `updateRideStatus` and `getRide` deployed; Hosting deployed at `https://chauffiq-a0366.web.app`.

### Phase 10 — Family Tracking & Trip History (Completed)
- **Family Real-Time Monitoring:**
  - Read-only real-time tracking interface for authenticated family members (`FamilyMonitoringPage.jsx`).
  - Active authorized rides quick-select chips showing Passenger UID, Pickup & Dropoff, and live status.
  - Driver & vehicle information cards (driver name, model, plate number, rating).
  - Real-time GPS location polling (8s) and ride status polling (12s) with automated stop on `COMPLETED`/`CANCELLED` or component unmount.
  - Google Maps direct link navigation (`https://www.google.com/maps?q=lat,lon`) for mobile and desktop without requiring a paid API key.
  - Interactive visual trip milestones timeline with verified server-side timestamps.
  - Strict read-only enforcement: Family members cannot alter ride status or driver locations.
- **Trip History & Pagination:**
  - New authenticated `getTripHistory` Cloud Function v2 endpoint in `asia-southeast1`.
  - Role-based server-side filtering (`PASSENGER`, `DRIVER`, `FAMILY`) with caller UID authorization.
  - Status filtering (`ALL`, `COMPLETED`, `CANCELLED`, `ACTIVE`) and pagination (limit up to 50, descending order).
  - Passenger/Driver/Family responsive Trip History UI (`TripHistoryPage.jsx`) with quick filters, milestone badges, and modal inspection dialog.
  - Client SDK methods: `rides.getTripHistory(params)` and `family.getFamilyRides(params)`.
- **Server Lifecycle Timestamps:**
  - Server-side recording of `requestedAt`, `acceptedAt`, `arrivingAt`, `startedAt`, `completedAt`, and `cancelledAt` in Cloud Functions v2.
  - Immutability of terminal ride states (`COMPLETED`/`CANCELLED`) strictly enforced.
- **Test Suites:**
  - `test_phase10.js`: 22/22 PASSED (Production)
  - `test_phase9.js`: 13/13 PASSED (Production)
  - `test_phase8.js`: 16/16 PASSED (Production)
  - `test_phone_auth.js`: 9/9 PASSED (Emulator)
  - `test_client_integration.js`: 13/13 PASSED (Emulator)
  - `test_fcm.js`: 16/16 PASSED (Emulator)
  - `test_frontend_workflow.js`: 15/15 PASSED (Emulator)
- **Production Deployment:**
  - Cloud Functions: `getTripHistory`, `createRide`, `updateRideStatus`, `getRide` deployed with `invoker: "public"`.
  - Firebase Hosting deployed at `https://chauffiq-a0366.web.app`.

### Phase 11 — Production Security & Monitoring (Completed)
- **Error Response Sanitization:**
  - Standardized `safeInternalError` helper across all 16 Cloud Functions v2.
  - Eliminated raw database exception exposure (`error: error.message`) from client JSON responses.
  - Sanitized 500 error responses across all endpoints (`register`, `createDriver`, `createRide`, `updateDriverLocation`, `getDriverLocation`, `updateDriverAvailability`, `getAvailableDrivers`, `updateRideStatus`, `createFamilyMonitoring`, `createNotification`, `getRide`, `login`, `syncUser`, `registerFcmToken`, `getTripHistory`).
- **Input Validation & Boundary Hardening:**
  - Strict string type and character length limits enforced (email RFC check max 254, password 6-128, name max 100, pickup/destination max 255, title max 120, message max 500, FCM token max 4096).
  - Out-of-bounds coordinate guards on `updateDriverLocation` (lat [-90, 90], lon [-180, 180]).
  - Self-monitoring prevention on `createFamilyMonitoring` (passenger cannot monitor themselves, returns 400).
  - Role & status filter validation on `getTripHistory` with 400 responses on invalid values.
- **Firestore Security Rules Hardening:**
  - Explicit direct-client block added for `users/{uid}/fcmTokens/{tokenId}` in `firestore.rules`.
  - Deployed to production Cloud Firestore.
- **Dependency Audit & Runtime Hardening:**
  - Resolved `qs` moderate vulnerability in functions dependencies without breaking changes.
  - Verified 0 vulnerabilities in frontend package dependencies.
  - Confirmed zero leaked keys, secrets, or passwords across source files.
- **Test Suites:**
  - `test_phase11.js`: 24/24 PASSED (Production)
  - `test_phase10.js`: 22/22 PASSED (Production)
  - `test_phase9.js`: 13/13 PASSED (Production)
  - `test_phase8.js`: 16/16 PASSED (Production)
  - `test_phone_auth.js`: 9/9 PASSED (Emulator)
  - `test_client_integration.js`: 13/13 PASSED (Emulator)
  - `test_fcm.js`: 16/16 PASSED (Emulator)
  - `test_frontend_workflow.js`: 15/15 PASSED (Emulator)
- **Production Deployment:**
  - All 18 Cloud Functions v2 deployed to `asia-southeast1`.
  - Firestore security rules deployed to Cloud Firestore.

### Phase 12 — Ratings + Feedback
- **Data Model:**
  - Firestore collection `/ratings/{ratingId}` with deterministic IDs: `${rideId}_${fromUid}_${toUid}` to prevent duplicate submissions.
  - Documents contain: `ratingId`, `rideId`, `fromUid`, `toUid`, `fromRole`, `toRole`, `rating` (1-5), `feedback` (optional string, max 1000 chars), `createdAt`.
  - Server-authoritative aggregate calculations update `ratingAverage`, `ratingCount`, `ratingTotal`, and legacy `rating` on `drivers/{driverId}` and `users/{passengerId}`.
- **Backend Cloud Functions v2:**
  - `submitRating`: Authenticated, ride participant only, COMPLETED status required, input sanitization, duplicate & self-rating prevention, aggregate calculation.
  - `getRideRatings`: Authenticated, participant or authorized family member only, returns all ratings for completed ride.
- **Firestore Security Rules:**
  - `/ratings/{ratingId}`: Direct client writes strictly blocked (`allow write: if false;`), read access allowed only to ride participants (`fromUid` or `toUid`).
- **Client SDK (`client/modules/rides.js`):**
  - Added `submitRating({ rideId, rating, feedback })` and `getRideRatings(rideId)` methods.
- **Frontend Dashboard:**
  - `RatingForm.jsx` component deployed to `PassengerDashboard` and `DriverDashboard`.
  - Interactive 1-5 star selector with labels ("Poor", "Fair", "Good", "Very Good", "Excellent").
  - Optional feedback textarea (1000 char counter) and double-submission protection.
  - Read-only submitted badge once rated.
  - Family member view verified strictly read-only with no rating controls.
- **Test Suites:**
  - `test_phase12.js`: 31/31 PASSED (Production)
  - `test_phase11.js`: 24/24 PASSED (Production)
  - `test_phase10.js`: 22/22 PASSED (Production)
  - `test_phase9.js`: 13/13 PASSED (Production)
  - `test_phase8.js`: 16/16 PASSED (Production)
  - `test_phone_auth.js`: 9/9 PASSED (Emulator)
  - `test_client_integration.js`: 13/13 PASSED (Emulator)
  - `test_fcm.js`: 16/16 PASSED (Emulator)
  - `test_frontend_workflow.js`: 15/15 PASSED (Emulator)


### Phase 13 — Payment Sandbox Architecture
- **Data Model:**
  - Firestore collection `/payments/{paymentId}` with deterministic IDs: `pay_${rideId}` for strict idempotency.
  - Documents contain: `paymentId`, `rideId`, `payerUid`, `payeeUid`, `amount` (server-calculated integer minor units / paise), `currency` (`INR`), `status` (`PENDING` | `AUTHORIZED` | `SUCCEEDED` | `FAILED` | `CANCELLED` | `REFUNDED`), `provider` (`SANDBOX`), `isSandbox: true`, `createdAt`, `updatedAt`, `completedAt` / `failedAt` / `cancelledAt`.
  - Server-authoritative fare calculation (base ₹250 + ₹25/km estimated or minimum floor). Client cannot supply or manipulate amount.
  - Zero sensitive payment credentials (no card numbers, CVVs, bank credentials, UPI PINs).
- **Backend Cloud Functions v2:**
  - `createPayment`: Authenticated, passenger only, completed ride only, server-calculated fare, idempotent upsert.
  - `getPayment`: Authenticated, participant or authorized family member only.
  - `simulatePaymentResult`: Authenticated, passenger only, transitions `PENDING` ➔ `SUCCEEDED` / `FAILED` / `CANCELLED`. Terminal states are immutable.
- **Firestore Security Rules:**
  - `/payments/{paymentId}`: Direct client writes strictly blocked (`allow write: if false;`), read access permitted only to payment participants (`payerUid` or `payeeUid`).
- **Client SDK (`client/modules/payments.js`):**
  - Added `PaymentsApi` with `createPayment({ rideId })`, `getPayment(paymentId)`, and `simulatePaymentResult({ paymentId, outcome, reason })`.
  - Exposed via `client.payments`.
- **Frontend Dashboard:**
  - `PaymentSection.jsx` component deployed to `PassengerDashboard` and `DriverDashboard`.
  - Prominent "SANDBOX TEST MODE" visual indicator and warning badges.
  - Passenger controls: Calculate/initiate fare, simulate sandbox Success, Failure, and Cancel actions.
  - Real-time receipt display upon payment success.
  - Driver & family views: Read-only status indicators without simulation actions.
- **Test Suites:**
  - `test_phase13.js`: 28/28 PASSED (Production)
  - `test_phase12.js`: 31/31 PASSED (Production)
  - `test_phase11.js`: 24/24 PASSED (Production)
  - `test_phase10.js`: 22/22 PASSED (Production)
  - `test_phase9.js`: 13/13 PASSED (Production)
  - `test_phase8.js`: 16/16 PASSED (Production)
  - `test_phone_auth.js`: 9/9 PASSED (Emulator)
  - `test_client_integration.js`: 13/13 PASSED (Emulator)
  - `test_fcm.js`: 16/16 PASSED (Emulator)
  - `test_frontend_workflow.js`: 15/15 PASSED (Emulator)


### Phase 14 — Admin Dashboard
- **Admin Role Architecture:**
  - Dual server-authoritative admin authorization (`verifyAdmin(req)`):
    1. Firebase Auth Custom Claim: `admin: true` (or `role: "ADMIN"`)
    2. Server-authoritative Firestore `/admins/{uid}` collection record
  - Zero trust in client body roles, localStorage, URL parameters, or client-writable Firestore fields.
  - Normal users cannot self-promote.
- **Developer-Controlled Admin Bootstrap:**
  - Developer bootstrap endpoint `bootstrapAdmin` protected by a secret key (`x-admin-bootstrap-key`) header.
  - CLI script `scripts/set_admin.js` for administrative elevation using the Firebase Admin SDK.
- **Cloud Functions v2 Endpoints (`asia-southeast1`):**
  - `getAdminOverview`: Aggregated metrics (users, drivers, rides, payments, ratings, and system health).
  - `getAdminUsers`: Paginated list of users (sanitized, limit max 100, role filter, search). Excludes passwords, hashes, tokens, FCM tokens.
  - `getAdminDrivers`: Paginated fleet visibility (vehicle, availability, ratings, total trips). No continuous GPS tracking.
  - `getAdminRides`: Paginated ride registry with lifecycle timestamps and participant IDs.
  - `getAdminPayments`: Paginated sandbox payments (strictly marked `provider: "SANDBOX"`, `isSandbox: true`).
  - `getAdminRatings`: Paginated two-sided ratings and feedback.
  - `getAdminRideDetails`: Deep inspection for an individual ride (routing, participants, timeline, sandbox receipt, reviews). Strictly read-only.
- **Firestore Security Rules:**
  - `/admins/{uid}`: Direct client writes and reads 100% blocked (`allow read, write: if false;`). Managed exclusively via Admin SDK.
- **Client SDK (`client/modules/admin.js`):**
  - Added `AdminApi` module registered on `client.admin`.
- **Frontend Admin Experience (`frontend/src/`):**
  - `AdminDashboard.jsx`: Metric cards, operational tables with status pills, lifecycle distribution, and ride inspection modal.
  - Guarded route: Non-admin users see "Access Denied" with zero data fetched.
  - `Navbar.jsx`: Admin tab displayed conditionally only when `user?.role === 'ADMIN' || user?.isAdmin === true`.
- **Test Suites:**
  - `test_phase14.js`: 35/35 PASSED (Production)
  - `test_phase13.js`: 28/28 PASSED (Production)
  - `test_phase12.js`: 31/31 PASSED (Production)
  - `test_phase11.js`: 24/24 PASSED (Production)
  - `test_phase10.js`: 22/22 PASSED (Production)
  - `test_phase9.js`: 13/13 PASSED (Production)
  - `test_phase8.js`: 16/16 PASSED (Production)
  - `test_phone_auth.js`: 9/9 PASSED (Emulator)
  - `test_client_integration.js`: 13/13 PASSED (Emulator)
  - `test_fcm.js`: 16/16 PASSED (Emulator)
  - `test_frontend_workflow.js`: 15/15 PASSED (Emulator)

---

## 6. Verification & Test Suite Summary

```
=====================================================================
                      TEST EXECUTION SUMMARY
=====================================================================
• Phase 14 Admin Dashboard Suite (35 tests)      : 35 / 35 PASSED (100%)
• Phase 13 Payment Sandbox Suite (28 tests)      : 28 / 28 PASSED (100%)
• Phase 12 Ratings & Feedback Suite (31 tests)   : 31 / 31 PASSED (100%)
• Phase 11 Production Security Suite (24 tests) : 24 / 24 PASSED (100%)
• Phase 10 Family & History Suite (22 tests)    : 22 / 22 PASSED (100%)
• Phase 9 UX & Lifecycle Suite (13 tests)       : 13 / 13 PASSED (100%)
• Phase 8 Live Tracking Suite (16 tests)        : 16 / 16 PASSED (100%)
• Client SDK Integration Suite (13 tests)        : 13 / 13 PASSED (100%)
• Frontend Workflow Suite (15 tests)             : 15 / 15 PASSED (100%)
• Phase 7A Phone Auth Suite (9 tests)            :  9 /  9 PASSED (100%)
• Phase 7B FCM Push Suite (16 tests)             : 16 / 16 PASSED (100%)
• Functions ESLint Quality Gate                  :  0 Errors, 0 Warnings
• Frontend Vite Production Build                 :  Clean (348ms build time)
=====================================================================
TOTAL AUTOMATED TESTS: 222 / 222 PASSED (100% PASS RATE)
=====================================================================
```

---

## 7. Security & Privacy Guarantees

1. **Zero Secret Leakage:** Neither `WEB_API_KEY`, service account keys, nor user passwords are ever written to source control, logs, or error responses.
2. **Server-Side Authorization:** Cloud Functions ignore caller-supplied `uid` fields in HTTP request bodies and exclusively trust the cryptographically verified `decodedToken.uid`.
3. **Database Shielding:** Firestore security rules block 100% of direct client writes. Only serverless functions using the Admin SDK can modify documents.
4. **Input Sanitization:** Geolocation coordinates are strictly bounded to valid numeric ranges; phone numbers must adhere to E.164 international standards; status changes follow an unalterable directed graph.

---

## 8. Suggested Future Enhancements (Roadmap)

While the core ride-hailing, family monitoring, native phone authentication, and FCM push notification flows are completely operational and deployed, the following enhancements can be considered for subsequent development iterations:
- **Mapping & Routing:** Integrate Google Maps Platform (Directions API & Maps JavaScript SDK) for interactive route rendering and dynamic ETAs.
- **Driver Verification:** Add Cloud Storage for driver document uploads (driving license, vehicle registration, background checks).

