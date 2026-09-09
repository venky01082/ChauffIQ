# CHAUFFIQ BETA USER TEST PLAN

**Target URL:** `https://chauffiq-a0366.web.app/`  
**Backend:** `https://asia-southeast1-chauffiq-a0366.cloudfunctions.net`  
**Evaluation Model:** Real-world step-by-step acceptance scenarios  

---

## 1. PASSENGER SCENARIOS

### Scenario P-01: User Registration & Session Persistence
* **Step 1:** Open `https://chauffiq-a0366.web.app/` on mobile or desktop browser.
* **Step 2:** Click **Register** or enter mobile number / credentials.
* **Step 3:** Enter received 6-digit OTP or complete sign-in.
* **Step 4:** Verify app successfully opens `<PassengerDashboard />`.
* **Step 5:** Press browser reload / F5.
* **Expected Result:** Session restores automatically without requiring re-authentication.

### Scenario P-02: Request & Track Ride
* **Step 1:** In `<PassengerDashboard />`, enter Pickup location (e.g. `Indiranagar Metro`) and Destination (e.g. `Bangalore Airport`).
* **Step 2:** Click **Request Luxury Chauffeur**.
* **Step 3:** Verify ride is assigned a unique `rideId` and enters `REQUESTED` state.
* **Step 4:** Observe real-time transition when chauffeur accepts (`ACCEPTED` → `ARRIVING` → `STARTED`).
* **Step 5:** Verify live driver coordinates update on screen with a working **Open in Google Maps** link.

### Scenario P-03: Ride Completion, Review & Payment
* **Step 1:** Once driver marks trip `COMPLETED`, verify `<RatingForm />` and `<PaymentSection />` appear.
* **Step 2:** Select 5 stars, enter feedback (e.g. `Excellent driving, very polite chauffeur`), and click **Submit Review**.
* **Step 3:** Verify rating is confirmed and recorded.
* **Step 4:** Click **Pay Now (Sandbox Simulation)** in `<PaymentSection />`.
* **Step 5:** Verify transaction transitions to `SUCCEEDED`.
* **Step 6:** Navigate to **Trip History** tab and verify the completed trip appears with full itinerary.

---

## 2. CHAUFFEUR / DRIVER SCENARIOS

### Scenario D-01: Duty Toggle & Availability
* **Step 1:** Sign in with driver account and open `<DriverDashboard />`.
* **Step 2:** If first time: submit vehicle number and model.
* **Step 3:** Toggle availability switch to **Online**.
* **Step 4:** Verify duty status displays active green badge.

### Scenario D-02: Ride Dispatch & State Machine Progression
* **Step 1:** Enter or receive assigned `rideId` in driver dashboard.
* **Step 2:** Click **Accept Ride**; verify status changes to `ACCEPTED`.
* **Step 3:** Click **Mark Arriving** upon approaching pickup location.
* **Step 4:** Click **Start Trip** when passenger is seated in vehicle.
* **Step 5:** Enable GPS broadcast or input test coordinates; verify coordinates transmit successfully.
* **Step 6:** Click **Complete Trip** upon reaching destination.
* **Step 7:** Verify driver status automatically resets to available.

---

## 3. FAMILY MONITORING SCENARIOS

### Scenario F-01: Live Safety Monitoring
* **Step 1:** Sign in with family member account and navigate to **Family Monitoring** tab.
* **Step 2:** Ensure passenger has authorized this family member UID for an active trip.
* **Step 3:** Enter the `rideId` or observe auto-detected monitored ride.
* **Step 4:** Verify live vehicle coordinates, driver name, and status timeline appear in real-time.
* **Step 5:** Click **Open in Google Maps** to verify external map opens at correct GPS marker.

### Scenario F-02: Read-Only Security Verification
* **Step 1:** In `<FamilyMonitoringPage />`, observe that no ride cancellation or status progression buttons exist.
* **Step 2:** Verify that the family interface is strictly read-only for safety and auditing.

---

## 4. ADMINISTRATOR SCENARIOS

### Scenario A-01: Operational Dashboard & Telemetry
* **Step 1:** Log in with designated administrator account.
* **Step 2:** Navigate to `#admin` or click **Admin** in navigation bar.
* **Step 3:** Verify operational telemetry counters load:
  - Total Registered Users
  - Active Platform Trips
  - Available Fleet Drivers
  - Gross Platform Volume (Sandbox)
* **Step 4:** Switch between tabs: **Rides**, **Drivers**, **Users**, **Payments**, **Ratings**.
* **Step 5:** Click **Inspect** on any completed ride to view participant details and sandbox payment breakdown.

### Scenario A-02: Role Access Control
* **Step 1:** Log out of admin account and log in as standard passenger.
* **Step 2:** Attempt to access `#admin` or `/admin`.
* **Step 3:** Verify UI displays **Access Denied: Administrator privileges required** (HTTP 403).
