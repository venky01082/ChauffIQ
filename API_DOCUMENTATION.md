# ChauffIQ Pure Backend API Documentation

Welcome to the comprehensive API specification for the **ChauffIQ** backend services.
The backend is built on **Node.js 24**, **Google Cloud Functions v2**, **Cloud Firestore**, **Firebase Authentication**, and **Firebase Cloud Messaging (FCM)**.

---

## 1. System Architecture & Base URLs

### 1.1 Invocation Paradigms
ChauffIQ provides dual-access APIs:
1. **Unified Express REST Gateway**: Mounted on Firebase Hosting and Cloud Functions at `/api/v1/*` and `/api/*`.
2. **Individual Cloud Functions v2**: High-throughput microservice endpoints under the regional Cloud Functions URL.

### 1.2 Base URLs
- **Unified Gateway (Firebase Hosting)**:  
  `https://chauffiq-a0366.web.app/api/v1`
- **Regional Cloud Functions**:  
  `https://asia-southeast1-chauffiq-a0366.cloudfunctions.net/<functionName>`
- **Local Emulators**:  
  `http://127.0.0.1:5001/chauffiq-a0366/asia-southeast1/<functionName>`

---

## 2. Authentication & Security Architecture

### 2.1 Firebase ID Tokens (Bearer Authentication)
All authenticated endpoints require a valid Firebase ID token passed in the `Authorization` header:
```http
Authorization: Bearer <firebase_id_token>
```

### 2.2 Role-Based Access Control (RBAC)
- `PASSENGER`: Books rides, monitors trips, creates payments, rates drivers.
- `DRIVER`: Accepts rides, updates availability, streams GPS location, rates passengers.
- `FAMILY`: Monitors passenger trips in real-time.
- `ADMIN`: Server-authoritative role verified via Firebase custom claims (`admin: true`) and Firestore `/admins/{uid}` document. Has operational visibility across the entire platform.

### 2.3 Rate Limiting & Abuse Prevention
- Distributed sliding-window limiter backed by Firestore collection `_rateLimits`.
- Zero PII persisted: IPs are hashed via SHA-256.
- Public auth endpoints (`/register`, `/login`) enforce strict limits:
  - Registration: 25 requests / 15 minutes.
  - Login: 35 requests / 15 minutes.
- When quota is exceeded, returns HTTP `429 Too Many Requests` with `Retry-After: <seconds>` header.
- **Developer Bypass**: Test suites can provide `x-admin-bootstrap-key: <ADMIN_BOOTSTRAP_SECRET>` to bypass rate limits.

---

## 3. Complete API Endpoint Catalog

### 3.1 Authentication & User Management

#### `POST /auth/register` (Function: `register`)
Registers a new user account (Passenger, Driver, or Family Member).

- **Authentication**: Public (Rate-limited)
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "Alex Johnson",
  "phone": "+919876543210",
  "role": "PASSENGER"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "uid": "u8K92mN...",
    "name": "Alex Johnson",
    "email": "user@example.com",
    "role": "PASSENGER"
  }
}
```

---

#### `POST /auth/login` (Function: `login`)
Authenticates credentials and returns Firebase ID token and refresh token.

- **Authentication**: Public (Rate-limited)
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "uid": "u8K92mN...",
    "email": "user@example.com",
    "name": "Alex Johnson",
    "phone": "+919876543210",
    "role": "PASSENGER",
    "isAdmin": false
  },
  "idToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "AMf-vBx..."
}
```

---

#### `POST /auth/sync` (Function: `syncUser`)
Synchronizes client profile with Firestore user document.

- **Authentication**: Bearer Token
- **Request Body**:
```json
{
  "name": "Alex J.",
  "phone": "+919876543210",
  "photoUrl": "https://example.com/avatar.jpg"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "User profile synchronized",
  "user": {
    "uid": "u8K92mN...",
    "email": "user@example.com",
    "name": "Alex J.",
    "phone": "+919876543210",
    "role": "PASSENGER",
    "updatedAt": "2026-09-08T14:30:00.000Z"
  }
}
```

---

### 3.2 Driver Management & Location Services

#### `POST /drivers/register` (Function: `createDriver`)
Registers vehicle and licensing information for an authenticated driver.

- **Authentication**: Bearer Token (Driver)
- **Request Body**:
```json
{
  "vehicleNumber": "KA01AB1234",
  "vehicleModel": "Toyota Innova Crysta",
  "licenseNumber": "DL1420110012345"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Driver profile created successfully",
  "driver": {
    "uid": "drv_99182",
    "vehicleNumber": "KA01AB1234",
    "vehicleModel": "Toyota Innova Crysta",
    "isAvailable": true,
    "isOnline": true,
    "rating": 5.0,
    "totalTrips": 0
  }
}
```

---

#### `PATCH /drivers/availability` (Function: `updateDriverAvailability`)
Toggles driver online/offline status.

- **Authentication**: Bearer Token (Driver)
- **Request Body**:
```json
{
  "isAvailable": true
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Driver availability set to true",
  "uid": "drv_99182",
  "isAvailable": true,
  "isOnline": true
}
```

---

#### `GET /drivers/available` (Function: `getAvailableDrivers`)
Lists online drivers currently available to accept ride requests.

- **Authentication**: Bearer Token
- **Response (200 OK)**:
```json
{
  "success": true,
  "count": 1,
  "drivers": [
    {
      "uid": "drv_99182",
      "name": "Ramesh Kumar",
      "vehicleNumber": "KA01AB1234",
      "vehicleModel": "Toyota Innova Crysta",
      "rating": 4.9,
      "isAvailable": true
    }
  ]
}
```

---

#### `POST /drivers/location` (Function: `updateDriverLocation`)
Streams real-time GPS coordinates of the driver vehicle.

- **Authentication**: Bearer Token (Driver)
- **Request Body**:
```json
{
  "latitude": 12.9716,
  "longitude": 77.5946,
  "heading": 180,
  "speed": 35.5,
  "rideId": "ride_123"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Location updated successfully",
  "location": {
    "driverId": "drv_99182",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "heading": 180,
    "speed": 35.5,
    "rideId": "ride_123",
    "updatedAt": "2026-09-08T14:32:00.000Z"
  }
}
```

---

#### `GET /drivers/location/:driverId` (Function: `getDriverLocation?driverId=...`)
Retrieves the latest GPS coordinate packet of a driver.

- **Authentication**: Bearer Token
- **Response (200 OK)**:
```json
{
  "success": true,
  "driverId": "drv_99182",
  "location": {
    "driverId": "drv_99182",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "heading": 180,
    "speed": 35.5,
    "updatedAt": "2026-09-08T14:32:00.000Z"
  }
}
```

---

### 3.3 Ride Booking & Lifecycle Management

#### `POST /rides/book` (Function: `createRide`)
Creates a new ride request.

- **Authentication**: Bearer Token (Passenger)
- **Request Body**:
```json
{
  "pickup": "MG Road Metro Station, Bengaluru",
  "destination": "Kempegowda International Airport",
  "fare": 1250,
  "pickupCoordinates": {"latitude": 12.9756, "longitude": 77.6066},
  "destinationCoordinates": {"latitude": 13.1986, "longitude": 77.7066}
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Ride requested successfully",
  "rideId": "ride_88319a",
  "ride": {
    "rideId": "ride_88319a",
    "passengerId": "u8K92mN...",
    "pickup": "MG Road Metro Station, Bengaluru",
    "destination": "Kempegowda International Airport",
    "fare": 1250,
    "status": "REQUESTED",
    "driverId": null,
    "requestedAt": "2026-09-08T14:35:00.000Z",
    "createdAt": "2026-09-08T14:35:00.000Z"
  }
}
```

---

#### `GET /rides/:rideId` (Function: `getRide?rideId=...`)
Fetches ride details and status. Authorized to passenger, assigned driver, family members, and admins.

- **Authentication**: Bearer Token (Participant)
- **Response (200 OK)**:
```json
{
  "success": true,
  "ride": {
    "rideId": "ride_88319a",
    "passengerId": "u8K92mN...",
    "driverId": "drv_99182",
    "pickup": "MG Road Metro Station, Bengaluru",
    "destination": "Kempegowda International Airport",
    "status": "ACCEPTED",
    "acceptedAt": "2026-09-08T14:36:00.000Z"
  }
}
```

---

#### `PATCH /rides/:rideId/status` (Function: `updateRideStatus`)
Transitions ride through its forward-only state machine:
`REQUESTED` &rarr; `ACCEPTED` &rarr; `ARRIVING` &rarr; `STARTED` &rarr; `COMPLETED` (or `CANCELLED`).

- **Authentication**: Bearer Token (Driver/Passenger)
- **Request Body**:
```json
{
  "status": "ACCEPTED"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Ride status updated to ACCEPTED",
  "ride": {
    "rideId": "ride_88319a",
    "status": "ACCEPTED",
    "driverId": "drv_99182",
    "acceptedAt": "2026-09-08T14:36:00.000Z",
    "updatedAt": "2026-09-08T14:36:00.000Z"
  }
}
```

---

### 3.4 Family Safety & Monitoring

#### `POST /family/monitor` (Function: `createFamilyMonitoring`)
Enables real-time ride tracking for a designated family member.

- **Authentication**: Bearer Token (Passenger)
- **Request Body**:
```json
{
  "familyMemberId": "fam_user_772",
  "rideId": "ride_88319a"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Family monitoring enabled",
  "monitoringId": "mon_0912a"
}
```

---

#### `GET /family/rides` (Function: `familyMonitoredRides`)
Lists active rides monitored by the authenticated family member.

- **Authentication**: Bearer Token (Family Member)
- **Response (200 OK)**:
```json
{
  "success": true,
  "count": 1,
  "rides": [
    {
      "rideId": "ride_88319a",
      "passengerId": "u8K92mN...",
      "status": "STARTED",
      "pickup": "MG Road Metro Station",
      "destination": "Kempegowda Airport"
    }
  ]
}
```

---

### 3.5 Trip History & Analytics

#### `GET /trips/history` (Function: `getTripHistory`)
Returns paginated, filtered ride history.

- **Authentication**: Bearer Token
- **Query Parameters**:
  - `role`: `PASSENGER` | `DRIVER` | `FAMILY` | `ALL` (default: `ALL`)
  - `status`: `COMPLETED` | `CANCELLED` | `ACTIVE` | `ALL` (default: `ALL`)
  - `limit`: `1` to `50` (default: `20`)
- **Response (200 OK)**:
```json
{
  "success": true,
  "count": 1,
  "total": 1,
  "rides": [
    {
      "rideId": "ride_88319a",
      "passengerId": "u8K92mN...",
      "driverId": "drv_99182",
      "status": "COMPLETED",
      "createdAt": "2026-09-08T14:35:00.000Z",
      "completedAt": "2026-09-08T15:15:00.000Z"
    }
  ]
}
```

---

### 3.6 Payments (Sandbox Gateway)

#### `POST /payments` (Function: `createPayment`)
Creates an authoritative server-calculated payment transaction for a completed ride.

- **Authentication**: Bearer Token (Passenger)
- **Request Body**:
```json
{
  "rideId": "ride_88319a"
}
```
- **Response (201 Created / 200 Idempotent)**:
```json
{
  "success": true,
  "message": "Sandbox payment initiated successfully",
  "paymentId": "pay_ride_88319a",
  "payment": {
    "paymentId": "pay_ride_88319a",
    "rideId": "ride_88319a",
    "payerUid": "u8K92mN...",
    "payeeUid": "drv_99182",
    "amount": 35000,
    "currency": "INR",
    "status": "PENDING",
    "provider": "SANDBOX",
    "isSandbox": true
  }
}
```

---

#### `GET /payments/:paymentId` (Function: `getPayment?paymentId=...`)
Retrieves payment status and metadata.

- **Authentication**: Bearer Token (Payer, Payee, Family, or Admin)
- **Response (200 OK)**:
```json
{
  "success": true,
  "paymentId": "pay_ride_88319a",
  "payment": {
    "paymentId": "pay_ride_88319a",
    "amount": 35000,
    "currency": "INR",
    "status": "SUCCEEDED",
    "provider": "SANDBOX",
    "isSandbox": true
  }
}
```

---

#### `POST /payments/simulate` (Function: `simulatePaymentResult`)
Simulates gateway webhook callbacks in sandbox mode.

- **Authentication**: Bearer Token (Passenger)
- **Request Body**:
```json
{
  "paymentId": "pay_ride_88319a",
  "outcome": "SUCCESS"
}
```
*(outcome must be one of: `SUCCESS`, `FAILURE`, `CANCEL`)*
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Sandbox payment updated to SUCCEEDED",
  "payment": {
    "paymentId": "pay_ride_88319a",
    "status": "SUCCEEDED",
    "completedAt": "2026-09-08T15:20:00.000Z"
  }
}
```

---

### 3.7 Ratings & Feedback

#### `POST /ratings` (Function: `submitRating`)
Submits a rating and feedback for a completed ride. Automatically updates aggregate ratings.

- **Authentication**: Bearer Token (Ride Participant)
- **Request Body**:
```json
{
  "rideId": "ride_88319a",
  "rating": 5,
  "feedback": "Smooth and punctual ride!"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Rating submitted successfully",
  "ratingId": "ride_88319a_u8K92mN_drv_99182",
  "rating": {
    "rideId": "ride_88319a",
    "fromRole": "PASSENGER",
    "toRole": "DRIVER",
    "rating": 5,
    "feedback": "Smooth and punctual ride!"
  }
}
```

---

#### `GET /ratings/ride/:rideId` (Function: `getRideRatings?rideId=...`)
Retrieves all ratings submitted for a completed ride.

- **Authentication**: Bearer Token (Ride Participant or Admin)
- **Response (200 OK)**:
```json
{
  "success": true,
  "rideId": "ride_88319a",
  "ratings": [
    {
      "ratingId": "ride_88319a_u8K92mN_drv_99182",
      "rating": 5,
      "feedback": "Smooth and punctual ride!"
    }
  ]
}
```

---

### 3.8 Push Notifications & FCM

#### `POST /notifications` (Function: `createNotification`)
Creates an in-app notification and pushes it via Firebase Cloud Messaging.

- **Authentication**: Bearer Token
- **Request Body**:
```json
{
  "title": "Ride Update",
  "message": "Your driver is 2 minutes away.",
  "type": "RIDE_UPDATE"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Notification created",
  "notificationId": "notif_99812"
}
```

---

#### `POST /notifications/fcm-token` (Function: `registerFcmToken`)
Registers or unregisters an FCM registration token for push notifications.

- **Authentication**: Bearer Token
- **POST Request Body (Register)**:
```json
{
  "token": "dG1hY2g6QVBBOTFiR2...",
  "deviceInfo": {"platform": "android", "os": "14"}
}
```
- **DELETE Request Body (Unregister)**:
```json
{
  "token": "dG1hY2g6QVBBOTFiR2..."
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "FCM token registered successfully",
  "tokenId": "3f8a9b..."
}
```

---

### 3.9 Admin Dashboard & Platform Operations

#### `POST /admin/bootstrap` (Function: `bootstrapAdmin`)
Elevates a user to Administrator privileges. Requires valid developer secret key.

- **Authentication**: Bearer Token
- **Request Headers**:
  `x-admin-bootstrap-key: <ADMIN_BOOTSTRAP_SECRET>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "User successfully designated as Administrator",
  "uid": "u8K92mN..."
}
```

---

#### `GET /admin/overview` (Function: `getAdminOverview`)
Retrieves aggregated operational KPIs across the entire platform.

- **Authentication**: Bearer Token (Admin)
- **Response (200 OK)**:
```json
{
  "success": true,
  "overview": {
    "users": {"total": 12, "passengers": 8, "drivers": 3, "admins": 1},
    "drivers": {"total": 3, "available": 2, "unavailable": 1},
    "rides": {"total": 15, "REQUESTED": 1, "COMPLETED": 12, "CANCELLED": 2},
    "payments": {
      "total": 12,
      "totalVolumePaise": 350000,
      "totalVolumeRupees": 3500.00,
      "currency": "INR",
      "provider": "SANDBOX",
      "SUCCEEDED": 12
    },
    "ratings": {
      "total": 12,
      "averageDriverRating": 4.9,
      "driverRatingCount": 8,
      "averagePassengerRating": 5.0,
      "passengerRatingCount": 4
    },
    "system": {
      "status": "OPERATIONAL",
      "region": "asia-southeast1",
      "backend": "HEALTHY",
      "firestore": "CONNECTED",
      "hosting": "ACTIVE",
      "isSandboxPayment": true
    }
  }
}
```

---

#### `GET /admin/users` (Function: `getAdminUsers`)
Paginated list of registered platform users. Password, tokens, and secrets are strictly excluded.

- **Authentication**: Bearer Token (Admin)
- **Query Parameters**: `limit` (1-100), `role`, `startAfter`, `search`

---

#### `GET /admin/drivers` (Function: `getAdminDrivers`)
Paginated list of drivers with vehicle models, license info, ratings, and availability status.

- **Authentication**: Bearer Token (Admin)
- **Query Parameters**: `limit` (1-100), `isAvailable`, `startAfter`

---

#### `GET /admin/rides` (Function: `getAdminRides`)
Paginated list of rides with full lifecycle timestamps (`requestedAt`, `acceptedAt`, `completedAt`).

- **Authentication**: Bearer Token (Admin)
- **Query Parameters**: `limit` (1-100), `status`, `startAfter`

---

#### `GET /admin/payments` (Function: `getAdminPayments`)
Paginated view of sandbox payment records.

- **Authentication**: Bearer Token (Admin)
- **Query Parameters**: `limit` (1-100), `status`, `startAfter`

---

#### `GET /admin/ratings` (Function: `getAdminRatings`)
Paginated list of customer and driver reviews.

- **Authentication**: Bearer Token (Admin)
- **Query Parameters**: `limit` (1-100), `startAfter`

---

#### `GET /admin/ride-details` (Function: `getAdminRideDetails?rideId=...`)
Deep operational inspection of a single ride including passenger, driver, payment, and ratings.

- **Authentication**: Bearer Token (Admin)
- **Query Parameters**: `rideId`

---

## 4. Deployment Instructions

```bash
# Deploy all Cloud Functions
firebase deploy --only functions

# Deploy Firestore Security Rules & Composite Indexes
firebase deploy --only firestore

# Deploy Hosting Portal (API Documentation & Gateway)
firebase deploy --only hosting

# Full Platform Deployment
firebase deploy
```
