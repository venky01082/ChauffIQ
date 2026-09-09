# CHAUFFIQ CONTROLLED BETA RELEASE PLAN

**Application:** ChauffIQ Full-Stack Mobility Platform  
**Target Environment:** Production (`chauffiq-a0366` / `asia-southeast1`)  
**Production Web Application:** `https://chauffiq-a0366.web.app/`  
**Production API Base:** `https://asia-southeast1-chauffiq-a0366.cloudfunctions.net`  
**Release Date:** 2026-09-09  
**Release Coordinator:** ChauffIQ Engineering Team  

---

## 1. BETA OBJECTIVE

The objective of this controlled beta is to validate the end-to-end user experience, carrier SMS delivery, real-world cellular GPS tracking, and server stability with a cohort of trusted users (**5 to 10 participants**) before public general availability.

---

## 2. TARGET BETA USERS & COHORT SIZING

| Cohort Role | Target Count | Profile Requirements | Focus Area |
| :--- | :--- | :--- | :--- |
| **Passengers** | 3 – 4 Users | Mobile smartphone users (iOS / Android / Chrome) | Ride booking, OTP verification, live map view, ratings, sandbox payment |
| **Chauffeurs / Drivers** | 2 – 3 Users | Drivers with GPS-enabled mobile smartphones | Duty toggle, ride dispatch acceptance, turn-by-turn progression, GPS broadcast |
| **Family Monitors** | 1 – 2 Users | Trusted secondary contacts | Authorization link receipt, real-time safety tracking, read-only UI |
| **Platform Administrator** | 1 User | Engineering / Operations Lead | Telemetry monitoring, rate limit surveillance, incident triage |

---

## 3. ONBOARDING PROCEDURES

### A. Passenger Onboarding
1. Open the production URL in mobile Chrome, Safari, or desktop browser:  
   `https://chauffiq-a0366.web.app/`
2. Select **Passenger** role tab.
3. Enter mobile phone number or test email to receive the 6-digit verification OTP.
4. Input the 6-digit OTP into the auto-advancing PIN input fields.
5. On successful login, the app opens `<PassengerDashboard />`.

### B. Chauffeur / Driver Onboarding
1. Open `https://chauffiq-a0366.web.app/` and select **Chauffeur / Driver** role.
2. Sign in with driver credentials.
3. If new driver: complete one-time onboarding form with Name, Phone, Vehicle Number (e.g. `KA-01-AB-1234`), and Vehicle Model (e.g. `Toyota Camry Hybrid`).
4. Toggle availability switch to **Online / Available**.
5. Keep browser or app active in foreground to enable continuous GPS coordinate broadcasting.

### C. Family Monitoring Onboarding
1. Open `https://chauffiq-a0366.web.app/` and log in as a secondary family user.
2. Copy the Family Member UID from profile or family tab.
3. The Passenger enters the Family Member UID in their active ride view under **Authorize Family Member**.
4. The Family user refreshes `<FamilyMonitoringPage />` to view live telemetry, trip timeline, and vehicle coordinates.

### D. Administrator Access
1. Administrator accesses the dashboard via URL hash `#admin` or `/admin`.
2. Operational dashboard validates server claims; unauthorized users are rejected with HTTP 403.
3. Admin monitors real-time KPI cards: Total Users, Active Trips, Available Fleet, and Gross Volume.

---

## 4. PRODUCTION INFRASTRUCTURE & URLS

* **Hosted Web Application:** `https://chauffiq-a0366.web.app/`
* **Alternative Hosting URL:** `https://chauffiq-a0366.firebaseapp.com/`
* **Cloud Functions Base URL:** `https://asia-southeast1-chauffiq-a0366.cloudfunctions.net`
* **Cloud Firestore Region:** `asia-southeast1` (Singapore)
* **Real-time Database Base:** `https://chauffiq-a0366-default-rtdb.asia-southeast1.firebasedatabase.app`

---

## 5. SUPPORT & INCIDENT CONTACT PROCEDURE

* **Beta Support Channel:** Direct message / WhatsApp beta group or GitHub Issues.
* **Email Support:** `support@chauffiq.local` (or designated engineering lead).
* **Urgent Bug Reporting:** Submit a feedback report using `BETA_FEEDBACK_TEMPLATE.md` with timestamps and screenshots.

---

## 6. BETA TESTING SCOPE

### In-Scope:
* User registration and authentication via Email/Password and 6-digit Phone SMS OTP.
* Session restoration across browser refreshes (F5).
* Ride booking, status lifecycle (`REQUESTED` → `ACCEPTED` → `ARRIVING` → `STARTED` → `COMPLETED`).
* Driver duty availability toggle and fleet query.
* GPS telemetry broadcast and live passenger map viewing.
* In-app notifications and trip history records.
* Bi-directional 1–5 star ratings and reviews.
* Sandbox payment initiation and simulation (`SUCCEEDED`).
* Mobile responsive viewports on iOS (Safari) and Android (Chrome).

### Out-of-Scope:
* Real credit card charging or live payment gateway settlement (all payments are strictly sandbox simulated).
* Large-scale concurrency / load testing (capped at beta user cohort).

---

## 7. KNOWN LIMITATIONS

1. **Carrier SMS Delivery Delays:** Depending on telecom carrier routing (DND settings in India), carrier SMS OTP delivery may experience 5–15 second latencies.
2. **Background GPS on Mobile Web:** When using a mobile browser, backgrounding the browser tab may throttle GPS broadcast due to mobile OS battery saving. Users should keep the tab active during active rides.
3. **Web Push Permissions:** Desktop/mobile browsers require explicit user permission approval before FCM Web Push notifications can display.

---

## 8. ROLLBACK PROCEDURE

If a critical regression or data inconsistency occurs during beta:
1. **Frontend Rollback:**
   ```bash
   # Re-deploy prior stable hosting release
   npx firebase-tools hosting:rollback --project chauffiq-a0366
   ```
2. **Backend Rollback:**
   ```bash
   # Re-deploy functions from verified tag or commit
   git checkout d54cfec
   npx firebase-tools deploy --only functions --project chauffiq-a0366
   ```
3. **Session Evacuation:**
   Admin can revoke user refresh tokens via Firebase Admin Console if an account is compromised.

---

## 9. INCIDENT HANDLING PROCEDURE

1. **Triage:** Immediately classify issue per `BETA_INCIDENT_RESPONSE.md` (P1 Critical through P4 Low).
2. **Isolation:** If P1, notify beta group to pause active rides.
3. **Diagnostics:** Inspect Google Cloud Logging (`asia-southeast1`) for structured error logs.
4. **Patch & Verify:** Commit fix to `main`, execute regression suite, and deploy.
