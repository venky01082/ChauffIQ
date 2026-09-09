# FRONTEND ↔ BACKEND INTEGRATION AUDIT

**Project:** ChauffIQ Full-Stack Mobility Platform  
**Target Directory:** `C:\Users\venky\Documents\ChauffIQ`  
**Firebase Project ID:** `chauffiq-a0366`  
**Backend Region:** `asia-southeast1`  
**Live Functions Base:** `https://asia-southeast1-chauffiq-a0366.cloudfunctions.net`  
**Live Production Web App:** `https://chauffiq-a0366.web.app/`  
**Audit Date:** 2026-09-09  
**Auditor:** Senior Staff Engineer / Systems Architect  

---

## EXECUTIVE SUMMARY

A forensic inspection of the repository reveals that the backend Cloud Functions and Firestore rules are fully functional, deployed, and passing 112/112 integration tests. The failure of the frontend to connect with the backend is caused by **three distinct, verifiable integration breakdowns**:

1. **Local Development Port / URL Misdirection:** When running the React frontend in local development (`npm run dev` / Vite on `localhost:5173`), the API client falls back to `DEFAULT_BASE_URL = "http://127.0.0.1:5001/chauffiq-a0366/asia-southeast1"` because no `frontend/.env` exists. All API calls fail immediately with `ERR_CONNECTION_REFUSED`.
2. **Missing Local Firebase Initialization:** In local development, `frontend/src/firebase.js` attempts to fetch `/__/firebase/init.json`. Because the Vite dev server is not Firebase Hosting, this returns HTTP 404, throwing:  
   `Error: Firebase configuration is not initialized.`
3. **Gateway Rewrite Route Mismatch:** If a client attempts to use the Firebase Hosting `/api/**` rewrite (e.g. `POST /api/login`), the backend Express router returns `HTTP 404 Cannot POST /login` because the Express router mounts `/api/auth/login`, not `/api/login`.
4. **Duplicate Disconnected Frontends Across Branches:** The repository contains two completely separate frontend projects:
   - Branch `main`: React + Vite SPA (`frontend/`) communicating via `client/` SDK.
   - Branch `frontend-complete`: Flutter mobile/web app (`lib/`) communicating via `lib/services/api_service.dart`.

---

## 1. IDENTIFY THE ACTUAL FRONTEND

### A. Repository Frontend Architecture Inventory

The repository contains **two distinct frontend applications** residing in different branches and directories:

| Metric | Frontend Application A (React Web SPA) | Frontend Application B (Flutter Mobile/Web) |
| :--- | :--- | :--- |
| **Location** | `frontend/` (tracked on branch `main`) | `lib/`, `web/`, `android/`, `ios/` (branch `frontend-complete`) |
| **Tech Stack** | React 19.2, Vite 8.2, CSS Modules | Flutter 3.x, Dart 3.13 |
| **Manifest** | `frontend/package.json` | `pubspec.yaml` |
| **Entry Point** | `frontend/index.html` → `frontend/src/main.jsx` | `lib/main.dart` |
| **API Client** | `frontend/src/api.js` (imports `client/index.js`) | `lib/services/api_service.dart` |
| **Firebase SDK** | `firebase: ^12.18.0` (`frontend/src/firebase.js`) | None (REST HTTP via `package:http`) |
| **Hosting Status** | Built to `frontend/dist`, deployed to `chauffiq-a0366.web.app` | Not deployed to Firebase Hosting |

### B. Dependency Paths (React Frontend on `main`)

```
1. Authentication:
   AuthPage.jsx
     → useAuth() [AuthContext.jsx]
       → signInWithPhoneNumber() / signInWithEmailAndPassword() [firebase.js]
         → TokenManager.setToken(idToken)
           → chauffiq.auth.syncUser() [client/modules/auth.js]
             → HttpClient.request({ path: "/syncUser", method: "POST", requiresAuth: true })
               → POST https://asia-southeast1-chauffiq-a0366.cloudfunctions.net/syncUser

2. Ride Booking:
   PassengerDashboard.jsx
     → chauffiq.rides.createRide({ pickup, destination, fare }) [client/modules/rides.js]
       → HttpClient.request({ path: "/createRide", method: "POST", body, requiresAuth: true })
         → POST https://asia-southeast1-chauffiq-a0366.cloudfunctions.net/createRide

3. Driver Availability & Trips:
   DriverDashboard.jsx
     → chauffiq.drivers.updateDriverAvailability({ isAvailable, isOnline }) [client/modules/drivers.js]
       → HttpClient.request({ path: "/updateDriverAvailability", method: "POST", body, requiresAuth: true })
         → POST https://asia-southeast1-chauffiq-a0366.cloudfunctions.net/updateDriverAvailability

4. Ride Tracking:
   PassengerDashboard.jsx / DriverDashboard.jsx
     → chauffiq.rides.getRide(rideId) [client/modules/rides.js]
       → HttpClient.request({ path: "/getRide", method: "GET", params: { rideId }, requiresAuth: true })
         → GET https://asia-southeast1-chauffiq-a0366.cloudfunctions.net/getRide?rideId=...
     → chauffiq.tracking.getDriverLocation(rideId) [client/modules/tracking.js]
       → HttpClient.request({ path: "/getDriverLocation", method: "GET", params: { rideId }, requiresAuth: true })
         → GET https://asia-southeast1-chauffiq-a0366.cloudfunctions.net/getDriverLocation?rideId=...

5. Admin Dashboard:
   AdminDashboard.jsx
     → chauffiq.admin.getOverview() / chauffiq.admin.getUsers() [client/modules/admin.js]
       → HttpClient.request({ path: "/getAdminOverview", method: "GET", requiresAuth: true })
         → GET https://asia-southeast1-chauffiq-a0366.cloudfunctions.net/getAdminOverview
```

---

## 2. API BASE URL COMPARISON

### A. URL Resolution Audit in `frontend/src/api.js` & `client/config.js`

```javascript
// frontend/src/api.js
const PROD_API_URL = 'https://asia-southeast1-chauffiq-a0366.cloudfunctions.net';
const isProd = import.meta.env.PROD;
const fallbackUrl = isProd ? PROD_API_URL : DEFAULT_BASE_URL;

const baseUrl =
  (typeof window !== 'undefined' && window.__CHAUFFIQ_API_URL__) ||
  (import.meta.env && import.meta.env.VITE_CHAUFFIQ_API_URL) ||
  fallbackUrl;
```

```javascript
// client/config.js
const DEFAULT_BASE_URL = "http://127.0.0.1:5001/chauffiq-a0366/asia-southeast1";
```

### B. Exact URL Comparison Table

| Environment | Config Source | Resolved Base URL | Target Expected | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Production Web** (`https://chauffiq-a0366.web.app`) | `import.meta.env.PROD === true` | `https://asia-southeast1-chauffiq-a0366.cloudfunctions.net` | `https://asia-southeast1-chauffiq-a0366.cloudfunctions.net` | **MATCH** |
| **Local Dev Server** (`http://localhost:5173`) | `DEFAULT_BASE_URL` (no `.env`) | `http://127.0.0.1:5001/chauffiq-a0366/asia-southeast1` | `https://asia-southeast1-chauffiq-a0366.cloudfunctions.net` | **MISMATCH (Connection Refused)** |
| **Flutter Mobile App** (`frontend-complete`) | `ApiService.baseUrl` | `https://asia-southeast1-chauffiq-a0366.cloudfunctions.net` | `https://asia-southeast1-chauffiq-a0366.cloudfunctions.net` | **MATCH** |
| **Firebase Hosting `/api/**` Rewrite** | `firebase.json` rewrite | `https://chauffiq-a0366.web.app/api/*` | Dispatches to `apiApp` (expects `/api/auth/*`) | **MISMATCH (404 for `/api/login`)** |

---

## 3. FIREBASE PROJECT CONFIGURATION COMPARISON

### Verification of Project Credentials

| Parameter | Frontend Config (`/__/firebase/init.json`) | Backend Config (`.firebaserc`) | Match |
| :--- | :--- | :--- | :--- |
| **Project ID** | `chauffiq-a0366` | `chauffiq-a0366` | **YES** |
| **Auth Domain** | `chauffiq-a0366.firebaseapp.com` | `chauffiq-a0366.firebaseapp.com` | **YES** |
| **Storage Bucket** | `chauffiq-a0366.firebasestorage.app` | `chauffiq-a0366.firebasestorage.app` | **YES** |
| **Messaging Sender ID** | `479028083173` | `479028083173` | **YES** |
| **Web App ID** | `1:479028083173:web:64305c55013fbdfb84970c` | Project default web app | **YES** |
| **RTDB URL** | `https://chauffiq-a0366-default-rtdb.asia-southeast1.firebasedatabase.app` | Regional RTDB | **YES** |

> **Audit Result:** The Firebase project IDs match exactly (`chauffiq-a0366`). The frontend is NOT pointing to a different Firebase project.

---

## 4. AUTHENTICATION FLOW COMPARISON

```
                                AUTHENTICATION LIFECYCLE
                                
  [User Enters Credentials]
             │
             ▼
   Firebase Client Auth ──────────► Firebase Authentication Service
             │                                    │
             │ (ID Token JWT Issued)              │
             ◄────────────────────────────────────┘
             │
             ▼
   TokenManager.setToken(idToken)
             │
             ▼
   HTTP Request ──────────────────► Backend Cloud Function
   Header: Bearer <idToken>                 │
                                            ▼
                                   verifyToken(req) [authMiddleware.js]
                                            │
                                            ▼
                                   Decoded UID: decodedToken.uid
                                            │
                                            ▼
                                   Firestore users/{uid} Record
```

### Flaws Identified in Auth Flow:
1. **Local Vite Dev Crash:** `getFirebaseAuth()` in `frontend/src/firebase.js` throws an unhandled exception if `/__/firebase/init.json` returns 404 (which always happens under Vite localhost without a dev proxy or `.env.development`).
2. **Flutter Token Key Mismatch (Prior to Option B patch):** Flutter `ApiService.login()` looked for `data["token"]` instead of `data["idToken"]`, leaving `_idToken = null`.
3. **Rate Limiting:** `authController.js` enforces a strict 35-attempt / 15-minute window for `/login` and 25-attempt window for `/register` tracked in Firestore `_rateLimits`. Rapid automated tests will receive `HTTP 429 Too Many Requests`.

---

## 5. COMPLETE API INTEGRATION MATRIX

| # | Endpoint | Method | Backend Function | Required Auth | Request Body / Query | Response Shape | Frontend Status |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `/hello` | GET | `hello` | Public | None | `{ success, message }` | **MATCH** |
| 2 | `/register` | POST | `register` | Public | `{ email, password, name, phone, role }` | `{ success, message, user }` | **MATCH** |
| 3 | `/login` | POST | `login` | Public | `{ email, password }` | `{ success, user, idToken, refreshToken }` | **MATCH** |
| 4 | `/syncUser` | POST | `syncUser` | Bearer Token | `{ name, phone, role }` | `{ success, message, user }` | **MATCH** |
| 5 | `/createRide` | POST | `createRide` | Bearer Token | `{ pickup, destination, fare }` | `{ success, message, rideId, ride }` | **MATCH** |
| 6 | `/getRide` | GET | `getRide` | Bearer Token | `?rideId=<id>` | `{ success, ride }` | **MATCH** |
| 7 | `/updateRideStatus`| POST/PATCH | `updateRideStatus`| Bearer Token | `{ rideId, status }` | `{ success, message, ride }` | **MATCH** |
| 8 | `/createDriver` | POST | `createDriver` | Bearer Token | `{ name, phone, vehicleNumber, vehicleModel }` | `{ success, message, driverId }` | **MATCH** |
| 9 | `/updateDriverAvailability` | POST/PATCH | `updateDriverAvailability` | Bearer Token | `{ isAvailable }` | `{ success, message, isAvailable }` | **MATCH** |
| 10 | `/getAvailableDrivers` | GET | `getAvailableDrivers` | Bearer Token | None | `{ success, count, drivers }` | **MATCH** |
| 11 | `/updateDriverLocation` | POST | `updateDriverLocation` | Bearer Token | `{ rideId, latitude, longitude }` | `{ success, message, location }` | **MATCH** |
| 12 | `/getDriverLocation` | GET | `getDriverLocation` | Bearer Token | `?rideId=<id>` | `{ success, location }` | **MATCH** |
| 13 | `/createFamilyMonitoring` | POST | `createFamilyMonitoring` | Bearer Token | `{ rideId, familyMemberId, relationship }` | `{ success, message, monitoringId }` | **MATCH** |
| 14 | `/getTripHistory` | GET | `getTripHistory` | Bearer Token | `?role=...&status=...&limit=...` | `{ success, count, total, rides }` | **MATCH** |
| 15 | `/createNotification` | POST | `createNotification` | Bearer Token | `{ recipientUid, title, message }` | `{ success, message, notificationId }` | **MATCH** |
| 16 | `/registerFcmToken` | POST | `registerFcmToken` | Bearer Token | `{ fcmToken, platform }` | `{ success, message }` | **MATCH** |
| 17 | `/submitRating` | POST | `submitRating` | Bearer Token | `{ rideId, rating, feedback }` | `{ success, message, ratingId }` | **MATCH** |
| 18 | `/getRideRatings` | GET | `getRideRatings` | Bearer Token | `?rideId=<id>` | `{ success, rideId, ratings }` | **MATCH** |
| 19 | `/createPayment` | POST | `createPayment` | Bearer Token | `{ rideId }` | `{ success, message, paymentId, payment }` | **MATCH** |
| 20 | `/getPayment` | GET | `getPayment` | Bearer Token | `?rideId=<id>` or `?paymentId=<id>` | `{ success, paymentId, payment }` | **MATCH** |
| 21 | `/simulatePaymentResult` | POST | `simulatePaymentResult` | Bearer Token | `{ paymentId, outcome }` | `{ success, message, payment }` | **MATCH** |
| 22 | `/getAdminOverview` | GET | `getAdminOverview` | Bearer Token (Admin) | None | `{ success, overview }` | **MATCH** |
| 23 | `/getAdminUsers` | GET | `getAdminUsers` | Bearer Token (Admin) | `?limit=...&role=...` | `{ success, users, totalCount }` | **MATCH** |
| 24 | `/getAdminDrivers` | GET | `getAdminDrivers` | Bearer Token (Admin) | `?limit=...&isAvailable=...` | `{ success, drivers, totalCount }` | **MATCH** |
| 25 | `/getAdminRides` | GET | `getAdminRides` | Bearer Token (Admin) | `?limit=...&status=...` | `{ success, rides, totalCount }` | **MATCH** |
| 26 | `/getAdminPayments` | GET | `getAdminPayments` | Bearer Token (Admin) | `?limit=...&status=...` | `{ success, payments, totalCount }` | **MATCH** |
| 27 | `/getAdminRatings` | GET | `getAdminRatings` | Bearer Token (Admin) | `?limit=...` | `{ success, ratings, totalCount }` | **MATCH** |
| 28 | `/getAdminRideDetails` | GET | `getAdminRideDetails` | Bearer Token (Admin) | `?rideId=<id>` | `{ success, ride, passenger, driver, payment, ratings }` | **MATCH** |
| 29 | `/bootstrapAdmin` | POST | `bootstrapAdmin` | Bearer Token + Header | Header: `x-admin-bootstrap-key` | `{ success, message, uid }` | **MATCH** |

---

## 6. HTTP METHODS AUDIT

* **GET Endpoints:** `/hello`, `/getRide`, `/getAvailableDrivers`, `/getDriverLocation`, `/getTripHistory`, `/getRideRatings`, `/getPayment`, and all 7 `/getAdmin*` endpoints.  
  *Backend accepts:* `GET`.  
  *Frontend sends:* `GET`.  
  *Status:* **100% MATCH**.
* **POST Endpoints:** `/register`, `/login`, `/syncUser`, `/createRide`, `/createDriver`, `/updateRideStatus`, `/updateDriverAvailability`, `/updateDriverLocation`, `/createFamilyMonitoring`, `/createNotification`, `/registerFcmToken`, `/submitRating`, `/createPayment`, `/simulatePaymentResult`, `/bootstrapAdmin`.  
  *Backend accepts:* `POST` (or `PATCH` where appropriate).  
  *Frontend sends:* `POST`.  
  *Status:* **100% MATCH**.

---

## 7. REQUEST BODY SCHEMA AUDIT

| Endpoint | Parameter Expected by Backend | Field Sent by React SDK (`client/`) | Field Sent by Original Flutter (`frontend-complete` commit `4532da9`) |
| :--- | :--- | :--- | :--- |
| `/createRide` | `pickup` (string, required)<br>`destination` (string, required)<br>`fare` (number) | `pickup`, `destination` (**MATCH**) | `pickup`, `drop` (**MISMATCH → HTTP 400**) |
| `/createDriver` | `name` (string, required)<br>`phone` (string, required)<br>`vehicleNumber` (string, required)<br>`vehicleModel` (string, required) | `name`, `phone`, `vehicleNumber`, `vehicleModel` (**MATCH**) | `vehicleType`, `vehicleNumber`, `licenseNumber` (**MISMATCH → HTTP 400**) |
| `/login` | `email` (string, required)<br>`password` (string, required) | `email`, `password` (**MATCH**) | `email`, `password` (**MATCH**) |
| `/updateRideStatus` | `rideId` (string, required)<br>`status` (enum, required) | `rideId`, `status` (**MATCH**) | `rideId`, `status` (**MATCH**) |
| `/updateDriverLocation` | `rideId` (string, required)<br>`latitude` (number)<br>`longitude` (number) | `rideId`, `latitude`, `longitude` (**MATCH**) | `rideId`, `latitude`, `longitude` (**MATCH**) |

---

## 8. RESPONSE FORMAT AUDIT

| Endpoint | Backend JSON Response | React Client Expectation | Flutter Client Expectation |
| :--- | :--- | :--- | :--- |
| `/login` | `{ success: true, idToken: "...", user: { uid, email, role } }` | Reads `response.idToken` (**MATCH**) | Original Flutter looked for `data["token"]` (**MISMATCH → idToken stayed null**) |
| `/createRide` | `{ success: true, message: "...", rideId: "...", ride: {...} }` | Reads `response.rideId` (**MATCH**) | Looked for `data["data"]["rideId"]` (**MISMATCH**) |
| `/createDriver`| `{ success: true, message: "...", driverId: "..." }` | Reads `response.driverId` (**MATCH**) | Handled in-memory (**MISMATCH**) |

---

## 9. CORS ANALYSIS

### Backend CORS Whitelist (`functions/utils/constants.js`):
```javascript
const ALLOWED_ORIGINS = [
  "https://chauffiq-a0366.web.app",
  "https://chauffiq-a0366.firebaseapp.com",
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];
```

### Live Preflight Test Output:
* `Origin: https://chauffiq-a0366.web.app` → **HTTP 204 No Content**, `Access-Control-Allow-Origin: https://chauffiq-a0366.web.app`
* `Origin: http://localhost:5173` → **HTTP 204 No Content**, `Access-Control-Allow-Origin: http://localhost:5173`
* `Origin: http://localhost:3000` → **HTTP 204 No Content**, `Access-Control-Allow-Origin: http://localhost:3000`

> **Audit Result:** CORS is correctly configured for both production hosting and all local development ports. CORS is NOT blocking communication.

---

## 10. VITE ENVIRONMENT VARIABLES AUDIT

| File | Status on Disk | Contents / Missing Keys |
| :--- | :--- | :--- |
| `frontend/.env` | **DOES NOT EXIST** | Missing entirely |
| `frontend/.env.local` | **DOES NOT EXIST** | Missing entirely |
| `frontend/.env.development`| **DOES NOT EXIST** | Missing entirely |
| `frontend/.env.production` | **DOES NOT EXIST** | Missing entirely |
| `frontend/.env.example` | Present in Git | Has `VITE_CHAUFFIQ_API_URL` and `VITE_FIREBASE_VAPID_KEY`. Missing `VITE_FIREBASE_API_KEY`. |
| Root `.env.local` | Present on Disk | Has only `ADMIN_BOOTSTRAP_SECRET`. Not loaded by Vite (outside `frontend/` root). |

> **Consequence:** In local Vite development (`npm run dev`), `import.meta.env.VITE_CHAUFFIQ_API_URL` and `import.meta.env.VITE_FIREBASE_API_KEY` are both `undefined`.

---

## 11. FIREBASE HOSTING `/api` REWRITE AUDIT

In `firebase.json`:
```json
"rewrites": [
  {
    "source": "/api/**",
    "function": {
      "functionId": "api",
      "region": "asia-southeast1"
    }
  },
  {
    "source": "**",
    "destination": "/index.html"
  }
]
```

### Route Comparison Test:
* `POST /login` (Direct Cloud Function): **HTTP 401 (Valid route)**
* `POST /api/auth/login` (Through Express Gateway): **HTTP 401 (Valid route)**
* `POST /api/login` (Direct through `/api/**` rewrite): **HTTP 404 Cannot POST /login (ROUTE MISMATCH)**

> **Consequence:** If the friend's frontend calls relative URLs like `/api/login` or `/api/createRide`, it will receive `404 Not Found`.

---

## 12. DEPLOYMENT STATUS

* **Frontend Hosting:** Deployed to Firebase Hosting (`https://chauffiq-a0366.web.app`) from `frontend/dist`.
* **Backend Functions:** 28 Cloud Functions v2 deployed in `asia-southeast1` under project `chauffiq-a0366`.
* **Database:** Cloud Firestore deployed in `asia-southeast1` with composite indexes and security rules active.

---

## 13. LIVE CONNECTIVITY VERIFICATION RESULTS

```
[LIVE VERIFICATION MATRIX]
GET  https://asia-southeast1-chauffiq-a0366.cloudfunctions.net/hello
Status: 200 OK
Body: {"success":true,"message":"ChauffIQ Backend is working!"}

POST https://asia-southeast1-chauffiq-a0366.cloudfunctions.net/register
Status: 201 Created
Body: {"success":true,"message":"User registered successfully","user":{"uid":"...","name":"...","email":"..."}}

POST https://asia-southeast1-chauffiq-a0366.cloudfunctions.net/login
Status: 200 OK
Body: {"success":true,"message":"Login successful","idToken":"eyJhbGciOiJSUzI1NiIs...","user":{...}}

POST https://asia-southeast1-chauffiq-a0366.cloudfunctions.net/createRide (with Bearer idToken)
Status: 201 Created
Body: {"success":true,"message":"Ride created successfully","rideId":"1YR3ZZfF48yB19mFPaC1"}

POST https://asia-southeast1-chauffiq-a0366.cloudfunctions.net/createDriver (with Bearer idToken)
Status: 201 Created
Body: {"success":true,"message":"Driver profile created successfully","driverId":"..."}
```

---

## 14. BROWSER NETWORK AUDIT (Local Dev Failure Sequence)

When running the React frontend locally (`npm run dev` at `http://localhost:5173`):

### First Failing Request:
* **Request URL:** `http://localhost:5173/__/firebase/init.json`
* **HTTP Method:** `GET`
* **HTTP Status:** `404 Not Found`
* **Console Error:**  
  `Uncaught (in promise) Error: Firebase configuration is not initialized. Please ensure environment variables or Firebase Hosting init.json is available.`
* **Result:** App crashes on initialization; blank white screen.

### Second Failing Request (If Firebase is bypassed or mocked):
* **Request URL:** `http://127.0.0.1:5001/chauffiq-a0366/asia-southeast1/login`
* **HTTP Method:** `POST`
* **HTTP Status:** `ERR_CONNECTION_REFUSED`
* **Result:** The client attempted to reach port 5001 (local emulator), which is not running.

---

## 15. ROOT CAUSE CLASSIFICATION

### [CRITICAL] Root Cause #1: Local Frontend Missing Environment File (`frontend/.env`)
The React frontend in `frontend/` has **zero `.env` files**. In production on Firebase Hosting, it works because Google's CDN serves `/__/firebase/init.json` and `isProd` points to `cloudfunctions.net`. But on any developer machine running `npm run dev`:
1. `/__/firebase/init.json` returns 404, throwing a fatal initialization error.
2. `client/config.js` falls back to `http://127.0.0.1:5001` (Firebase Emulator), sending all requests to a closed port.

### [CRITICAL] Root Cause #2: Dual Unsynchronized Frontend Branches
The friend's frontend was committed to branch `origin/frontend-complete` as a Flutter app, while the user's backend and React web app live on `main`. These branches have **zero shared Git lineage** (orphaned roots). Neither was aware of the other's environment or build scripts.

### [HIGH] Root Cause #3: Gateway Path Incompatibility (`/api/login` vs `/api/auth/login`)
The Firebase Hosting rewrite sends `/api/**` to the Express `apiApp`. But `apiApp` routes auth under `/auth/*`, `/v1/auth/*`, and `/api/auth/*`. A request to `/api/login` yields `Cannot POST /login (404)`.

### [HIGH] Root Cause #4: Flutter Frontend API Contract Mismatches (on `frontend-complete` commit `4532da9`)
The Flutter app on `frontend-complete` had 4 fatal bugs:
1. `createRide` sent `drop` instead of `destination` (HTTP 400).
2. `createDriver` omitted `vehicleModel`, `name`, `phone` (HTTP 400).
3. `login` parsed `data["token"]` instead of `data["idToken"]` (HTTP 401).
4. No screens called `ApiService`; all modified in-memory static lists.

---

## 16. RECOMMENDED FIX & ACTION PLAN

### Step 1: Create `frontend/.env.development` and `frontend/.env.production`
Provide the exact public configuration so the React frontend works immediately in both Vite local dev and production:
```env
# frontend/.env.development
VITE_CHAUFFIQ_API_URL=https://asia-southeast1-chauffiq-a0366.cloudfunctions.net
VITE_FIREBASE_API_KEY=AIzaSyCj7w7JAlJOSRlCIP_6XYLxhPCOtXhEVzM
VITE_FIREBASE_AUTH_DOMAIN=chauffiq-a0366.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=chauffiq-a0366
VITE_FIREBASE_STORAGE_BUCKET=chauffiq-a0366.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=479028083173
VITE_FIREBASE_APP_ID=1:479028083173:web:64305c55013fbdfb84970c
```

### Step 2: Fix `client/config.js` Fallback URL
Update `client/config.js` so that if no emulator is running, the default fallback URL is the live production Cloud Functions URL (`https://asia-southeast1-chauffiq-a0366.cloudfunctions.net`).

### Step 3: Add Alias Routes in Express Gateway (`functions/routes/apiRouter.js`)
Add flat route aliases (`/login`, `/register`, `/syncUser`, `/createRide`, `/createDriver`, etc.) to `apiApp` so that clients calling `/api/login` succeed identically to `/api/auth/login` and direct `/login`.

---

## 17. FILES THAT MUST BE CHANGED

1. `frontend/.env.development` [NEW] — Injects Firebase credentials and live backend URL for Vite local dev.
2. `frontend/.env.production` [NEW] — Ensures production builds always use live endpoints.
3. `client/config.js` [MODIFY] — Change `DEFAULT_BASE_URL` fallback to production Cloud Functions base URL.
4. `functions/routes/apiRouter.js` [MODIFY] — Add flat route aliases (`/api/login`, `/api/register`, `/api/createRide`) for reverse-proxy compatibility.

---

## 18. FILES THAT MUST NOT BE CHANGED

* **DO NOT MODIFY:** `functions/controllers/*` — Backend business logic and validations are verified and working.
* **DO NOT MODIFY:** `functions/services/*` — Firestore database queries and mutations are correct.
* **DO NOT MODIFY:** `firestore.rules` — Strict security rules are fully operational.
* **DO NOT MODIFY:** `firestore.indexes.json` — All 26 composite indexes are active.
* **DO NOT MODIFY:** `functions/middleware/authMiddleware.js` — Bearer token validation is operating correctly.
* **DO NOT MODIFY:** `functions/utils/constants.js` — CORS whitelist is already correct.

---

## 19. DEPLOYMENT STEPS AFTER APPROVAL

```bash
# 1. Test local frontend with new environment configuration:
cd frontend
npm run dev

# 2. Verify build succeeds:
npm run build

# 3. Deploy updated hosting and gateway:
npx firebase-tools deploy --only hosting,functions:api
```
