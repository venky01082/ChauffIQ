# ChauffIQ — Enterprise On-Demand Ride & Chauffeur Platform

ChauffIQ is a production-grade, secure, multi-party ride hailing and chauffeur management platform built on Google Firebase (Cloud Functions v2, Cloud Firestore, Realtime Database, Firebase Authentication, Firebase Hosting, Cloud Messaging) with a modern React 19 / Tailwind CSS responsive frontend.

---

## 🌟 Platform Highlights (Phases 1–14 Completed)

- **Phase 1: Core Ride Lifecycle & Dispatch** — Server-authoritative ride creation, fare estimations, geolocation distance calculations, and status transitions (`REQUESTED`, `ASSIGNED`, `IN_TRANSIT`, `COMPLETED`, `CANCELLED`).
- **Phase 2: Driver Acceptance & Ride Matching** — Atomic driver matching, state machine verification, and concurrency locks preventing double booking.
- **Phase 3: Live Driver Geolocation & Spatial Tracking** — Realtime Database high-frequency GPS coordinate ingestion, passenger live ETA updates, and location persistence.
- **Phase 4: Family Monitoring & Live Safety Observer** — Granular family member sharing codes, real-time read-only safety tracking, trip progress monitoring, and emergency SOS alerts.
- **Phase 5: Trip Completion & Billing Finalization** — Server-authoritative distance calculation, base fare + surge multiplier computation, and trip summary generation.
- **Phase 6: Cancellation Handlers & Idle Timeout Safeguards** — Graceful cancellation workflows with penalty calculation, scheduled background cleanup functions, and driver re-allocation.
- **Phase 7: Real-Time Multi-Party Notifications (FCM v1)** — Firebase Cloud Messaging Web Push notifications for Passengers, Drivers, and Family members across lifecycle events.
- **Phase 8: Multi-Region High-Availability Failover** — Primary deployments in `asia-southeast1` with automated secondary failover architecture and heartbeat health monitoring.
- **Phase 9: Comprehensive Client SDK** — Modular JavaScript SDK (`client/`) supporting Auth, Drivers, Family, Notifications, Payments, Rides, and Tracking with resilient token refresh.
- **Phase 10: Multi-Role Production Web Frontend** — React 19 + Tailwind responsive single-page web app with dedicated dashboards for **Passengers**, **Drivers**, and **Family Monitors**.
- **Phase 11: Production Security Hardening & Zero-Trust Audit** — Strict Firestore security rules with zero-trust client direct-write blocking on sensitive ride and financial collections.
- **Phase 12: Dual-Party Rating & Feedback System** — Server-validated 1-5 star ratings, feedback collection, aggregate metric tracking, and duplicate submission prevention.
- **Phase 13: Payment Sandbox Architecture** — Idempotent mock payment provider abstraction (`sandbox_stripe`, `sandbox_razorpay`, `sandbox_upi`), server-side fare verification, and transaction audit trails.
- **Phase 14: Comprehensive Admin Dashboard** — Dual server-authorized (`admin: true` custom claims + `/admins/{uid}` Firestore records) operational dashboard with KPI analytics, ride inspection, driver verification, user management, and read-only audit logging.

---

## 🏗 Architecture & Tech Stack

- **Backend / API**: Google Cloud Functions v2 (Node.js 20 / 22) deployed in `asia-southeast1`
- **Database**: 
  - **Cloud Firestore**: Persistent storage for users, drivers, rides, payments, ratings, admins, and audit logs.
  - **Firebase Realtime Database**: Low-latency driver GPS telemetry and live coordinate streams.
- **Authentication**: Firebase Authentication with phone auth, email/password, and custom claims (`admin: true`).
- **Push Notifications**: Firebase Cloud Messaging (FCM v1 HTTP API) with service worker background delivery.
- **Frontend**: React 19, Vite 6, Tailwind CSS, Heroicons, Firebase Web SDK v11.
- **Hosting**: Firebase Hosting with global CDN edge caching.

---

## 🧪 Comprehensive Automated Test Suites

The project features a **222-test automated regression suite** covering every phase and security boundary:

| Test Suite | Tests Passed | Coverage Area |
| :--- | :---: | :--- |
| `test_phone_auth.js` | **10 / 10** | Phone authentication & session verification |
| `test_client_integration.js` | **15 / 15** | Client SDK modular API requests |
| `test_fcm.js` | **14 / 14** | Multi-party FCM notification delivery |
| `test_frontend_workflow.js` | **18 / 18** | End-to-end ride simulation & driver flow |
| `test_phase8.js` | **15 / 15** | High-availability failover & regional routing |
| `test_phase9.js` | **15 / 15** | Client SDK token auto-refresh & retry logic |
| `test_phase10.js` | **25 / 25** | Multi-role dashboard routes & live components |
| `test_phase11.js` | **25 / 25** | Security hardening & Firestore rule enforcement |
| `test_phase12.js` | **31 / 31** | Dual-party rating state machine & metrics |
| `test_phase13.js` | **29 / 29** | Payment sandbox, idempotency & fare calculation |
| `test_phase14.js` | **35 / 35** | Admin dual-claim authorization, KPIs & audit |
| **Total Automated Tests** | **222 / 222** | **100% Passing (0 failures, 0 regressions)** |

---

## 📁 Repository Structure

```
ChauffIQ/
├── client/                     # Modular ChauffIQ Client SDK
│   ├── config.js               # SDK environment & endpoint settings
│   ├── httpClient.js           # Resilient HTTP client with retry logic
│   ├── tokenManager.js         # JWT token management & auto-refresh
│   └── modules/                # Domain-specific SDK modules
│       ├── admin.js            # Admin metrics & management APIs
│       ├── auth.js             # Authentication & user profile APIs
│       ├── drivers.js          # Driver shift & availability APIs
│       ├── family.js           # Family safety sharing APIs
│       ├── notifications.js    # FCM push subscription APIs
│       ├── payments.js         # Sandbox payment processing APIs
│       ├── rides.js            # Ride request & lifecycle APIs
│       └── tracking.js         # Realtime GPS location APIs
├── frontend/                   # React 19 / Vite Web Application
│   ├── src/
│   │   ├── components/         # Navbar, Alert, RatingForm, PaymentSection
│   │   ├── context/            # AuthContext & state management
│   │   └── pages/              # Passenger, Driver, Family, Admin, Auth
│   ├── public/                 # Service workers, icons & static assets
│   └── vite.config.js          # Vite build configuration
├── functions/                  # Cloud Functions v2 Backend
│   ├── index.js                # 28+ serverless Cloud Functions
│   └── package.json            # Node.js dependencies
├── scripts/                    # Management & deployment utilities
│   ├── set_admin.js            # Dual admin claim provisioning script
│   └── push_to_github.js       # Git synchronization script
├── firestore.rules             # Production Firestore security rules
├── firestore.indexes.json      # Composite indexes for queries
├── database.rules.json         # Realtime DB tracking security rules
├── firebase.json               # Firebase hosting, functions & emulators
├── STATUS.md                   # Detailed platform roadmap & phase logs
└── README.md                   # Project overview & documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ installed
- Firebase CLI (`npm install -g firebase-tools`)

### Setup & Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/venky01082/ChauffIQ.git
   cd ChauffIQ
   ```

2. Install dependencies:
   ```bash
   # Install backend dependencies
   cd functions && npm install && cd ..

   # Install frontend dependencies
   cd frontend && npm install && cd ..
   ```

3. Run automated tests:
   ```bash
   node test_phase14.js
   ```

4. Run the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

---

## 🔒 Security & Privacy

- **Dual-Layer Admin Authorization**: Requires both Firebase Auth Custom Claims (`admin: true`) and an authoritative `/admins/{uid}` server record.
- **Zero Client Trust**: Direct Firestore client writes to rides, payments, and ratings are strictly denied by `firestore.rules`. All state transitions require server-validated Cloud Functions v2.
- **Sensitive Data Redaction**: Payment methods are strictly sandbox-mode; no live banking credentials, CVV, or cardholder numbers are stored.

---

## 📄 License
Proprietary & Confidential — All rights reserved.
