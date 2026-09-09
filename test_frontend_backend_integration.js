/**
 * test_frontend_backend_integration.js
 *
 * ChauffIQ Frontend ↔ Backend Live Integration Test Suite
 *
 * Validates 100% live communication between client contracts (Flutter ApiService
 * and React ChauffIQ Client) and the deployed Firebase Cloud Functions v2 backend
 * at https://asia-southeast1-chauffiq-a0366.cloudfunctions.net.
 *
 * Scenarios Tested:
 *   1. GET  /hello — Public health endpoint returns 200
 *   2. POST /register — Passenger registration returns 201
 *   3. POST /register — Driver registration returns 201
 *   4. POST /login — Passenger authentication returns 200 with idToken
 *   5. POST /login — Driver authentication returns 200 with idToken
 *   6. POST /syncUser — Passenger profile sync returns 200
 *   7. POST /createDriver — Driver profile creation returns 201 with driverId
 *   8. POST /updateDriverAvailability — Driver goes online (isAvailable: true) returns 200
 *   9. GET  /getAvailableDrivers — Passenger queries available drivers returns 200
 *  10. POST /createRide — Passenger books ride (pickup, destination, fare) returns 201
 *  11. GET  /getRide — Query ride state returns 200
 *  12. POST /createFamilyMonitoring — Link family member for live safety tracking returns 201
 *  13. POST /updateRideStatus — Driver accepts ride (ACCEPTED) returns 200
 *  14. POST /updateDriverLocation — Driver broadcasts GPS location returns 200
 *  15. GET  /getDriverLocation — Passenger/Family reads live driver coordinates returns 200
 *  16. POST /updateRideStatus — Driver arrives at pickup (ARRIVING) returns 200
 *  17. POST /updateRideStatus — Trip begins (STARTED) returns 200
 *  18. POST /updateRideStatus — Trip concludes (COMPLETED) returns 200
 *  19. POST /createNotification — Send in-app notification to passenger returns 201
 *  20. GET  /getTripHistory — Passenger queries completed trips returns 200
 *  21. POST /submitRating — Passenger rates trip with rating & feedback returns 201
 *  22. GET  /getRideRatings — Read submitted ratings for completed ride returns 200
 *  23. POST /createPayment — Sandbox payment initiated for ride returns 200/201
 *  24. GET  /getPayment — Read payment record details returns 200
 *  25. POST /simulatePaymentResult — Complete sandbox payment (outcome: SUCCESS) returns 200
 *  26. Client SDK Config — client/config.js fallback points to live backend
 *  27. React Local Dev — frontend/.env.development configured with live backend
 *  28. React Production — frontend/.env.production configured with live backend
 *  29. Flutter API Contract — ApiService baseUrl matches Cloud Functions domain
 *  30. Flutter Auth Contract — ApiService parses idToken, destination, outcome, and feedback
 */

"use strict";

const fs = require("fs");
const path = require("path");

// Load local developer bypass key if present
if (fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

const BASE_URL = "https://asia-southeast1-chauffiq-a0366.cloudfunctions.net";
const BOOTSTRAP_SECRET = process.env.ADMIN_BOOTSTRAP_SECRET || "";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let passed = 0;
let failed = 0;
const testResults = [];

function assert(condition, testName, detail = "") {
  if (condition) {
    passed++;
    testResults.push({ name: testName, ok: true, detail });
    console.log(`  ${GREEN}✓ PASS${RESET}  ${testName}${detail ? ` (${detail})` : ""}`);
  } else {
    failed++;
    testResults.push({ name: testName, ok: false, detail });
    console.error(`  ${RED}✗ FAIL${RESET}  ${testName}${detail ? ` — ${detail}` : ""}`);
  }
}

async function apiGet(endpoint, token, params = {}) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (BOOTSTRAP_SECRET) headers["x-admin-bootstrap-key"] = BOOTSTRAP_SECRET;

  const res = await fetch(url.toString(), { method: "GET", headers });
  let body = {};
  try {
    body = await res.json();
  } catch (_) {}
  return { status: res.statusCode || res.status, body };
}

async function apiPost(endpoint, token, payload = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (BOOTSTRAP_SECRET) headers["x-admin-bootstrap-key"] = BOOTSTRAP_SECRET;

  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  let body = {};
  try {
    body = await res.json();
  } catch (_) {}
  return { status: res.statusCode || res.status, body };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runIntegrationSuite() {
  console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   CHAUFFIQ FRONTEND ↔ BACKEND LIVE INTEGRATION TEST SUITE       ${RESET}`);
  console.log(`${BOLD}${CYAN}================================================================${RESET}`);
  console.log(`Target Backend: ${BOLD}${BASE_URL}${RESET}`);
  console.log(`Timestamp:      ${new Date().toISOString()}\n`);

  const runId = Date.now().toString().slice(-6);
  const passEmail = `integration.pass.${runId}@test.chauffiq`;
  const drvEmail = `integration.drv.${runId}@test.chauffiq`;
  const famEmail = `integration.fam.${runId}@test.chauffiq`;
  const password = "IntegrationPass@99";

  let passenger = { token: null, uid: null };
  let driver = { token: null, uid: null, driverId: null };
  let family = { token: null, uid: null };
  let testRideId = null;
  let testPaymentId = null;

  // ─────────────────────────────────────────────────────────────
  // Section 1: Core Health & Availability
  // ─────────────────────────────────────────────────────────────
  console.log(`${BOLD}--- Section 1: Backend Health & Connectivity ---${RESET}`);
  try {
    const hello = await apiGet("hello");
    assert(
      hello.status === 200 && hello.body.success === true,
      "T01: GET /hello responds with 200 OK and success flag",
      `region: ${hello.body.region || "asia-southeast1"}`
    );
  } catch (err) {
    assert(false, "T01: GET /hello responds with 200 OK", err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // Section 2: User Registration & Authentication Flow
  // ─────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}--- Section 2: User Onboarding & Authentication ---${RESET}`);
  try {
    const regPass = await apiPost("register", null, {
      email: passEmail,
      password: password,
      name: `Pass Integration ${runId}`,
      phone: `+9198${runId}01`,
      role: "RIDER",
    });
    assert(
      regPass.status === 201 && regPass.body.success === true && regPass.body.user?.uid,
      "T02: POST /register passenger returns 201 Created with user UID",
      `UID: ${regPass.body.user?.uid?.slice(0, 10)}...`
    );
    passenger.uid = regPass.body.user?.uid;
  } catch (err) {
    assert(false, "T02: POST /register passenger", err.message);
  }

  try {
    const regDrv = await apiPost("register", null, {
      email: drvEmail,
      password: password,
      name: `Driver Integration ${runId}`,
      phone: `+9198${runId}02`,
      role: "DRIVER",
    });
    assert(
      regDrv.status === 201 && regDrv.body.success === true && regDrv.body.user?.uid,
      "T03: POST /register driver returns 201 Created with user UID",
      `UID: ${regDrv.body.user?.uid?.slice(0, 10)}...`
    );
    driver.uid = regDrv.body.user?.uid;
  } catch (err) {
    assert(false, "T03: POST /register driver", err.message);
  }

  try {
    const regFam = await apiPost("register", null, {
      email: famEmail,
      password: password,
      name: `Family Integration ${runId}`,
      phone: `+9198${runId}03`,
      role: "RIDER",
    });
    family.uid = regFam.body.user?.uid;
  } catch (_) {}

  // Login Passenger
  try {
    const loginPass = await apiPost("login", null, {
      email: passEmail,
      password: password,
    });
    assert(
      loginPass.status === 200 &&
        loginPass.body.success === true &&
        typeof loginPass.body.idToken === "string" &&
        loginPass.body.idToken.length > 50,
      "T04: POST /login passenger returns 200 OK with valid JWT idToken",
      `Token length: ${loginPass.body.idToken?.length} chars`
    );
    passenger.token = loginPass.body.idToken;
  } catch (err) {
    assert(false, "T04: POST /login passenger", err.message);
  }

  // Login Driver
  try {
    const loginDrv = await apiPost("login", null, {
      email: drvEmail,
      password: password,
    });
    assert(
      loginDrv.status === 200 &&
        loginDrv.body.success === true &&
        typeof loginDrv.body.idToken === "string",
      "T05: POST /login driver returns 200 OK with valid JWT idToken",
      `Token length: ${loginDrv.body.idToken?.length} chars`
    );
    driver.token = loginDrv.body.idToken;
  } catch (err) {
    assert(false, "T05: POST /login driver", err.message);
  }

  // Login Family Member
  try {
    const loginFam = await apiPost("login", null, {
      email: famEmail,
      password: password,
    });
    family.token = loginFam.body.idToken;
  } catch (_) {}

  // Sync User
  try {
    const syncRes = await apiPost("syncUser", passenger.token, {
      name: `Pass Integration ${runId} (Updated)`,
      role: "RIDER",
    });
    assert(
      syncRes.status === 200 && syncRes.body.success === true,
      "T06: POST /syncUser updates authenticated profile via Bearer token",
      syncRes.body.message || "Profile synchronized"
    );
  } catch (err) {
    assert(false, "T06: POST /syncUser", err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // Section 3: Driver Onboarding & Availability
  // ─────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}--- Section 3: Driver Profile & Availability Flow ---${RESET}`);
  try {
    const createDrvRes = await apiPost("createDriver", driver.token, {
      name: `Driver Integration ${runId}`,
      phone: `+9198${runId}02`,
      vehicleNumber: `KA-01-IQ-${runId.slice(-4)}`,
      vehicleModel: "Hyundai Verna (Executive)",
    });
    assert(
      createDrvRes.status === 201 &&
        createDrvRes.body.success === true &&
        Boolean(createDrvRes.body.driverId),
      "T07: POST /createDriver creates driver profile returns 201 with driverId",
      `driverId: ${createDrvRes.body.driverId}`
    );
    driver.driverId = createDrvRes.body.driverId;
  } catch (err) {
    assert(false, "T07: POST /createDriver", err.message);
  }

  try {
    const availRes = await apiPost("updateDriverAvailability", driver.token, {
      isAvailable: true,
    });
    assert(
      availRes.status === 200 && availRes.body.success === true,
      "T08: POST /updateDriverAvailability toggles driver online returns 200",
      `message: ${availRes.body.message}`
    );
  } catch (err) {
    assert(false, "T08: POST /updateDriverAvailability", err.message);
  }

  try {
    const availListRes = await apiGet("getAvailableDrivers", passenger.token);
    assert(
      availListRes.status === 200 &&
        availListRes.body.success === true &&
        Array.isArray(availListRes.body.drivers),
      "T09: GET /getAvailableDrivers returns list of active drivers returns 200",
      `Count: ${availListRes.body.drivers?.length}`
    );
  } catch (err) {
    assert(false, "T09: GET /getAvailableDrivers", err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // Section 4: Ride Booking, Tracking & State Machine Lifecycle
  // ─────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}--- Section 4: Ride Booking, Tracking & Lifecycle ---${RESET}`);
  try {
    const createRideRes = await apiPost("createRide", passenger.token, {
      pickup: "Embassy GolfLinks Business Park, Bengaluru",
      destination: "Kempegowda International Airport, Terminal 2",
      fare: 850,
      driverId: driver.driverId,
    });
    assert(
      createRideRes.status === 201 &&
        createRideRes.body.success === true &&
        Boolean(createRideRes.body.rideId),
      "T10: POST /createRide books ride returns 201 with rideId",
      `rideId: ${createRideRes.body.rideId}`
    );
    testRideId = createRideRes.body.rideId;
  } catch (err) {
    assert(false, "T10: POST /createRide", err.message);
  }

  try {
    const getRideRes = await apiGet("getRide", passenger.token, { rideId: testRideId });
    assert(
      getRideRes.status === 200 &&
        getRideRes.body.success === true &&
        getRideRes.body.ride?.rideId === testRideId,
      "T11: GET /getRide reads ride document returns 200",
      `status: ${getRideRes.body.ride?.status}`
    );
  } catch (err) {
    assert(false, "T11: GET /getRide", err.message);
  }

  // Family Monitoring Link
  try {
    const famRes = await apiPost("createFamilyMonitoring", passenger.token, {
      rideId: testRideId,
      familyMemberId: family.uid,
      relationship: "Spouse",
    });
    assert(
      famRes.status === 201 && famRes.body.success === true,
      "T12: POST /createFamilyMonitoring links trusted contact returns 201",
      `monitoringId: ${famRes.body.monitoringId}`
    );
  } catch (err) {
    assert(false, "T12: POST /createFamilyMonitoring", err.message);
  }

  // State: ACCEPTED
  try {
    const acceptRes = await apiPost("updateRideStatus", driver.token, {
      rideId: testRideId,
      status: "ACCEPTED",
    });
    assert(
      acceptRes.status === 200 && acceptRes.body.success === true,
      "T13: POST /updateRideStatus transition to ACCEPTED returns 200",
      `newStatus: ${acceptRes.body.ride?.status}`
    );
  } catch (err) {
    assert(false, "T13: POST /updateRideStatus (ACCEPTED)", err.message);
  }

  // Location update by Driver
  try {
    const locUpdateRes = await apiPost("updateDriverLocation", driver.token, {
      rideId: testRideId,
      latitude: 12.9485,
      longitude: 77.6433,
      heading: 45.0,
      speed: 38.5,
    });
    assert(
      locUpdateRes.status === 200 && locUpdateRes.body.success === true,
      "T14: POST /updateDriverLocation broadcasts GPS coordinates returns 200",
      `coords: ${locUpdateRes.body.location?.latitude}, ${locUpdateRes.body.location?.longitude}`
    );
  } catch (err) {
    assert(false, "T14: POST /updateDriverLocation", err.message);
  }

  // Location read by Passenger
  try {
    const locReadRes = await apiGet("getDriverLocation", passenger.token, {
      rideId: testRideId,
    });
    assert(
      locReadRes.status === 200 &&
        locReadRes.body.success === true &&
        locReadRes.body.location?.latitude === 12.9485,
      "T15: GET /getDriverLocation retrieves GPS coordinates returns 200",
      `lat: ${locReadRes.body.location?.latitude}, lng: ${locReadRes.body.location?.longitude}`
    );
  } catch (err) {
    assert(false, "T15: GET /getDriverLocation", err.message);
  }

  // State: ARRIVING
  try {
    const arrivingRes = await apiPost("updateRideStatus", driver.token, {
      rideId: testRideId,
      status: "ARRIVING",
    });
    assert(
      arrivingRes.status === 200 && arrivingRes.body.success === true,
      "T16: POST /updateRideStatus transition to ARRIVING returns 200",
      `newStatus: ${arrivingRes.body.ride?.status}`
    );
  } catch (err) {
    assert(false, "T16: POST /updateRideStatus (ARRIVING)", err.message);
  }

  // State: STARTED
  try {
    const startRes = await apiPost("updateRideStatus", driver.token, {
      rideId: testRideId,
      status: "STARTED",
    });
    assert(
      startRes.status === 200 && startRes.body.success === true,
      "T17: POST /updateRideStatus transition to STARTED returns 200",
      `newStatus: ${startRes.body.ride?.status}`
    );
  } catch (err) {
    assert(false, "T17: POST /updateRideStatus (STARTED)", err.message);
  }

  // State: COMPLETED
  try {
    const completeRes = await apiPost("updateRideStatus", driver.token, {
      rideId: testRideId,
      status: "COMPLETED",
    });
    assert(
      completeRes.status === 200 && completeRes.body.success === true,
      "T18: POST /updateRideStatus transition to COMPLETED returns 200",
      `newStatus: ${completeRes.body.ride?.status}`
    );
  } catch (err) {
    assert(false, "T18: POST /updateRideStatus (COMPLETED)", err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // Section 5: In-App Notifications & Trip History
  // ─────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}--- Section 5: Notifications & Trip History ---${RESET}`);
  try {
    const notifRes = await apiPost("createNotification", passenger.token, {
      recipientUid: passenger.uid,
      title: "Ride Completed",
      message: "Your ChauffIQ chauffeur has completed the journey safely.",
    });
    assert(
      notifRes.status === 201 && notifRes.body.success === true,
      "T19: POST /createNotification dispatches in-app notification returns 201",
      `notifId: ${notifRes.body.notificationId}`
    );
  } catch (err) {
    assert(false, "T19: POST /createNotification", err.message);
  }

  try {
    const histRes = await apiGet("getTripHistory", passenger.token, { limit: 10 });
    assert(
      histRes.status === 200 &&
        histRes.body.success === true &&
        Array.isArray(histRes.body.rides),
      "T20: GET /getTripHistory returns completed ride records returns 200",
      `rides retrieved: ${histRes.body.rides?.length}`
    );
  } catch (err) {
    assert(false, "T20: GET /getTripHistory", err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // Section 6: Ratings & Sandbox Payments
  // ─────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}--- Section 6: Ratings & Payments Flow ---${RESET}`);
  try {
    const ratingRes = await apiPost("submitRating", passenger.token, {
      rideId: testRideId,
      rating: 5,
      feedback: "Exceptional chauffeur service, punctual and highly professional!",
    });
    assert(
      ratingRes.status === 201 && ratingRes.body.success === true,
      "T21: POST /submitRating records 5-star rating with feedback returns 201",
      `ratingId: ${ratingRes.body.ratingId}`
    );
  } catch (err) {
    assert(false, "T21: POST /submitRating", err.message);
  }

  try {
    const getRatingRes = await apiGet("getRideRatings", passenger.token, {
      rideId: testRideId,
    });
    assert(
      getRatingRes.status === 200 &&
        getRatingRes.body.success === true &&
        Array.isArray(getRatingRes.body.ratings),
      "T22: GET /getRideRatings returns stored ratings for ride returns 200",
      `ratings count: ${getRatingRes.body.ratings?.length}`
    );
  } catch (err) {
    assert(false, "T22: GET /getRideRatings", err.message);
  }

  try {
    const payCreateRes = await apiPost("createPayment", passenger.token, {
      rideId: testRideId,
      paymentMethod: "CARD",
    });
    assert(
      (payCreateRes.status === 201 || payCreateRes.status === 200) &&
        payCreateRes.body.success === true &&
        Boolean(payCreateRes.body.paymentId),
      "T23: POST /createPayment initiates sandbox transaction returns 200/201",
      `paymentId: ${payCreateRes.body.paymentId}`
    );
    testPaymentId = payCreateRes.body.paymentId;
  } catch (err) {
    assert(false, "T23: POST /createPayment", err.message);
  }

  try {
    const payGetRes = await apiGet("getPayment", passenger.token, {
      rideId: testRideId,
    });
    assert(
      payGetRes.status === 200 &&
        payGetRes.body.success === true &&
        payGetRes.body.payment?.paymentId === testPaymentId,
      "T24: GET /getPayment returns active payment transaction record returns 200",
      `status: ${payGetRes.body.payment?.status}`
    );
  } catch (err) {
    assert(false, "T24: GET /getPayment", err.message);
  }

  try {
    const simRes = await apiPost("simulatePaymentResult", passenger.token, {
      paymentId: testPaymentId,
      outcome: "SUCCESS",
    });
    assert(
      simRes.status === 200 &&
        simRes.body.success === true &&
        simRes.body.payment?.status === "SUCCEEDED",
      "T25: POST /simulatePaymentResult (outcome: SUCCESS) transitions status to SUCCEEDED returns 200",
      `final status: ${simRes.body.payment?.status}`
    );
  } catch (err) {
    assert(false, "T25: POST /simulatePaymentResult", err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // Section 7: Configuration & Frontend Contract Adherence
  // ─────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}--- Section 7: Client SDK & Frontend Contract Verification ---${RESET}`);
  try {
    const clientConfig = require("./client/config");
    assert(
      clientConfig.DEFAULT_BASE_URL === BASE_URL,
      "T26: client/config.js DEFAULT_BASE_URL points to live Cloud Functions URL",
      clientConfig.DEFAULT_BASE_URL
    );
  } catch (err) {
    assert(false, "T26: client/config.js verification", err.message);
  }

  try {
    const devEnv = fs.readFileSync("frontend/.env.development", "utf8");
    assert(
      devEnv.includes("VITE_CHAUFFIQ_API_URL=https://asia-southeast1-chauffiq-a0366.cloudfunctions.net") &&
        devEnv.includes("VITE_FIREBASE_API_KEY="),
      "T27: frontend/.env.development configured with live backend and Firebase config",
      "Valid development environment"
    );
  } catch (err) {
    assert(false, "T27: frontend/.env.development verification", err.message);
  }

  try {
    const prodEnv = fs.readFileSync("frontend/.env.production", "utf8");
    assert(
      prodEnv.includes("VITE_CHAUFFIQ_API_URL=https://asia-southeast1-chauffiq-a0366.cloudfunctions.net") &&
        prodEnv.includes("VITE_FIREBASE_API_KEY="),
      "T28: frontend/.env.production configured with live backend and Firebase config",
      "Valid production environment"
    );
  } catch (err) {
    assert(false, "T28: frontend/.env.production verification", err.message);
  }

  try {
    const gitHeadFlutter = require("child_process")
      .execSync("git show origin/frontend-complete:lib/services/api_service.dart", { encoding: "utf8" });
    assert(
      gitHeadFlutter.includes("https://asia-southeast1-chauffiq-a0366.cloudfunctions.net") &&
        gitHeadFlutter.includes("baseUrl"),
      "T29: Flutter ApiService.baseUrl points to asia-southeast1 Cloud Functions backend",
      "Matched origin/frontend-complete"
    );
    assert(
      gitHeadFlutter.includes('"destination": drop') &&
        gitHeadFlutter.includes('data["idToken"]') &&
        gitHeadFlutter.includes('"feedback": cleanFeedback') &&
        gitHeadFlutter.includes('"outcome": validOutcome'),
      "T30: Flutter ApiService contracts match backend schema (idToken, destination, feedback, outcome)",
      "Strict contract compliance verified"
    );
  } catch (err) {
    assert(false, "T29-T30: Flutter git check", err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // Test Summary
  // ─────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}            INTEGRATION TEST RESULTS SUMMARY                    ${RESET}`);
  console.log(`${BOLD}${CYAN}================================================================${RESET}`);
  console.log(`Total Checks: ${BOLD}${testResults.length}${RESET}`);
  console.log(`Passed:       ${GREEN}${BOLD}${passed}${RESET}`);
  console.log(`Failed:       ${failed > 0 ? RED : GREEN}${BOLD}${failed}${RESET}`);

  if (failed === 0) {
    console.log(`\n${GREEN}${BOLD}✓ ALL 30 INTEGRATION CHECKS PASSED PERFECTLY!${RESET}\n`);
    process.exit(0);
  } else {
    console.error(`\n${RED}${BOLD}✗ ${failed} INTEGRATION CHECKS FAILED!${RESET}\n`);
    process.exit(1);
  }
}

runIntegrationSuite().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
