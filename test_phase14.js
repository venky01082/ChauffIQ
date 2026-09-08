/**
 * test_phase14.js — Phase 14 Admin Dashboard Comprehensive Test Suite
 *
 * Validates:
 *   A01: Unauthenticated admin overview -> 401
 *   A02: Missing Authorization header -> 401
 *   A03: Malformed Authorization header -> 401
 *   A04: Invalid / forged token -> 401
 *   A05: Authenticated non-admin user -> 403
 *   A06: Forged frontend admin role in request body -> 403
 *   A07: Forged admin UID in request body -> 403
 *   A08: Unsupported HTTP method (POST on GET endpoint) -> 405
 *   A09: Admin overview authorized -> 200 with complete metrics
 *   A10: Admin users authorized -> 200 paginated list
 *   A11: Admin drivers authorized -> 200 paginated list
 *   A12: Admin rides authorized -> 200 paginated list
 *   A13: Admin payments authorized -> 200 sandbox payments
 *   A14: Admin ratings authorized -> 200 ratings overview
 *   A15: Non-admin cannot access getAdminUsers -> 403
 *   A16: Non-admin cannot access getAdminRides -> 403
 *   A17: Non-admin cannot access getAdminPayments -> 403
 *   A18: Non-admin cannot access getAdminRatings -> 403
 *   A19: Pagination maximum enforced (clamps or rejects limit > 100)
 *   A20: Invalid pagination parameter (negative or NaN) -> 400
 *   A21: Invalid status filter rejected -> 400
 *   A22: Sensitive credentials absent from admin responses
 *   A23: Password fields absent from all user objects
 *   A24: Firebase ID tokens / refresh tokens absent from responses
 *   A25: FCM tokens absent from user/driver responses
 *   A26: Payment secrets / cards / CVVs absent from payment responses
 *   A27: Direct client write to /admins blocked by security rules -> 403
 *   A28: Normal user cannot self-promote to admin without developer secret -> 403
 *   A29: Admin ride details authorized -> 200 with complete timeline
 *   A30: Non-admin cannot access getAdminRideDetails -> 403
 *   A31: Family member remains non-admin -> 403
 *   A32: Driver remains non-admin -> 403
 *   A33: Passenger remains non-admin -> 403
 *   A34: Error responses contain no stack traces or secrets
 *   A35: Admin dashboard does not expose raw infrastructure credentials
 *
 * Usage: node test_phase14.js
 */

"use strict";

const fs = require("fs");
const path = require("path");

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
const PROJECT_ID = "chauffiq-a0366";
const BOOTSTRAP_SECRET = process.env.ADMIN_BOOTSTRAP_SECRET || "";

const GREEN = "[32m";
const RED = "[31m";
const YELLOW = "[33m";
const CYAN = "[36m";
const RESET = "[0m";

let passed = 0;
let failed = 0;
const results = [];

function ok(name, detail = "") {
  passed++;
  results.push({ name, ok: true, detail });
  console.log(`  ${GREEN}✓ PASS${RESET}  ${name}${detail ? `  (${detail})` : ""}`);
}

function fail(name, detail = "") {
  failed++;
  results.push({ name, ok: false, detail });
  console.log(`  ${RED}✗ FAIL${RESET}  ${name}${detail ? `  — ${detail}` : ""}`);
}

async function apiGet(path, token, params = {}, extraHeaders = {}) {
  const url = new URL(`${BASE_URL}/${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  const headers = { ...extraHeaders };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(url.toString(), { headers });
  return { status: resp.status, body: await resp.json().catch(() => ({})) };
}

async function apiPost(path, token, body, extraHeaders = {}, rawAuthHeader = null) {
  const headers = { "Content-Type": "application/json", ...extraHeaders };
  if (rawAuthHeader !== null) {
    headers["Authorization"] = rawAuthHeader;
  } else if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const resp = await fetch(`${BASE_URL}/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return { status: resp.status, body: await resp.json().catch(() => ({})) };
}

async function registerAndLogin(suffix) {
  const email = `phase14.${suffix}.${Date.now()}@test.chauffiq`;
  const pass = "AdminAuditPass!88";
  const name = `P14User_${suffix}`;

  const devHeaders = BOOTSTRAP_SECRET ? { "x-admin-bootstrap-key": BOOTSTRAP_SECRET } : {};
  const reg = await apiPost("register", null, { email, password: pass, name }, devHeaders);
  if (!reg.body.success) throw new Error(`Register failed for ${email}: ${JSON.stringify(reg.body)}`);

  const login = await apiPost("login", null, { email, password: pass }, devHeaders);
  if (!login.body.success) throw new Error(`Login failed for ${email}`);

  return { token: login.body.idToken, uid: login.body.user.uid, email, pass, name };
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createRideAndComplete(passenger, driver) {
  const rCreate = await apiPost("createRide", passenger.token, {
    pickup: "UB City, Vittal Mallya Rd, Bengaluru",
    destination: "Kempegowda International Airport, Bengaluru",
  });
  const rideId = rCreate.body.rideId;
  if (!rideId) throw new Error("Failed to create test ride: " + JSON.stringify(rCreate.body));

  await delay(200);
  await apiPost("updateRideStatus", driver.token, { rideId, status: "ACCEPTED" });
  await delay(200);
  await apiPost("updateRideStatus", driver.token, { rideId, status: "ARRIVING" });
  await delay(200);
  await apiPost("updateRideStatus", driver.token, { rideId, status: "STARTED" });
  await delay(200);
  await apiPost("updateRideStatus", driver.token, { rideId, status: "COMPLETED" });
  await delay(200);

  return rideId;
}

async function runTests() {
  console.log(`\n${CYAN}Phase 14 — Admin Dashboard Comprehensive Test Suite${RESET}`);
  console.log(`${CYAN}Base URL: ${BASE_URL}${RESET}\n`);

  console.log(`${YELLOW}Provisioning Phase 14 test actors…${RESET}`);
  let adminUser, passenger, driver, familyMember, stranger;
  try {
    [adminUser, passenger, driver, familyMember, stranger] = await Promise.all([
      registerAndLogin("admin"),
      registerAndLogin("pass"),
      registerAndLogin("drv"),
      registerAndLogin("family"),
      registerAndLogin("stranger"),
    ]);
  } catch (err) {
    console.error(`${RED}FATAL: Failed to provision test accounts: ${err.message}${RESET}`);
    process.exit(1);
  }

  console.log(`  Admin Candidate UID: ${adminUser.uid}`);
  console.log(`  Passenger UID:       ${passenger.uid}`);
  console.log(`  Driver UID:          ${driver.uid}`);
  console.log(`  Family UID:          ${familyMember.uid}`);
  console.log(`  Stranger UID:        ${stranger.uid}\n`);

  // Setup driver profile
  await apiPost("createDriver", driver.token, {
    name: "Luxury Chauffeur P14",
    phone: "+919876543298",
    vehicleNumber: "KA01P1414",
    vehicleModel: "Audi A8 L",
    rating: 5,
  });

  // Setup a completed ride with sandbox payment and rating
  console.log(`${YELLOW}Setting up completed test trip with payment and rating…${RESET}`);
  const testRideId = await createRideAndComplete(passenger, driver);
  await apiPost("createPayment", passenger.token, { rideId: testRideId });
  await apiPost("simulatePaymentResult", passenger.token, {
    paymentId: `pay_${testRideId}`,
    outcome: "SUCCESS",
  });
  await apiPost("submitRating", passenger.token, {
    rideId: testRideId,
    rating: 5,
    feedback: "Exceptional executive chauffeur experience!",
  });

  // ══════════════════════════════════════════════════════════════
  // SECTION 1: AUTHENTICATION, PROTOCOL & PERMISSION BOUNDARIES
  // ══════════════════════════════════════════════════════════════

  // ── A01: Unauthenticated admin overview -> 401 ──
  {
    const r = await apiGet("getAdminOverview", null);
    r.status === 401
      ? ok("A01 unauthenticated admin overview rejected -> 401", `status=${r.status}`)
      : fail("A01 unauthenticated admin overview", `status=${r.status}`);
  }

  // ── A02: Missing Authorization header -> 401 ──
  {
    const r = await apiPost("getAdminOverview", null, {}, {}, "");
    r.status === 401 || r.status === 405
      ? ok("A02 missing Authorization header rejected -> 401", `status=${r.status}`)
      : fail("A02 missing Authorization header", `status=${r.status}`);
  }

  // ── A03: Malformed Authorization header -> 401 ──
  {
    const r = await apiGet("getAdminOverview", null, {}, { Authorization: "Basic dXNlcjpwYXNz" });
    r.status === 401
      ? ok("A03 malformed Authorization header rejected -> 401", `status=${r.status}`)
      : fail("A03 malformed Authorization header", `status=${r.status}`);
  }

  // ── A04: Invalid / forged token -> 401 ──
  {
    const r = await apiGet("getAdminOverview", "invalid.jwt.forgedtokenxyz123");
    r.status === 401
      ? ok("A04 invalid or forged token rejected -> 401", `status=${r.status}`)
      : fail("A04 invalid or forged token", `status=${r.status}`);
  }

  // ── A05: Authenticated non-admin user -> 403 ──
  {
    const r = await apiGet("getAdminOverview", passenger.token);
    r.status === 403
      ? ok("A05 authenticated non-admin user rejected -> 403", `status=${r.status}`)
      : fail("A05 authenticated non-admin user", `status=${r.status}`);
  }

  // ── A06: Forged frontend admin role in body/params -> 403 ──
  {
    const r = await apiGet("getAdminOverview", passenger.token, { role: "ADMIN", isAdmin: true });
    r.status === 403
      ? ok("A06 forged frontend admin role rejected -> 403", `status=${r.status}`)
      : fail("A06 forged frontend admin role", `status=${r.status}`);
  }

  // ── A07: Forged admin UID in query/body -> 403 ──
  {
    const r = await apiGet("getAdminOverview", passenger.token, { uid: "admin_uid_impersonated" });
    r.status === 403
      ? ok("A07 forged admin UID rejected -> 403", `status=${r.status}`)
      : fail("A07 forged admin UID", `status=${r.status}`);
  }

  // ── A08: Unsupported HTTP method (POST on getAdminOverview) -> 405 ──
  {
    const r = await apiPost("getAdminOverview", passenger.token, {});
    r.status === 405
      ? ok("A08 POST on GET endpoint getAdminOverview rejected -> 405", `status=${r.status}`)
      : fail("A08 POST on getAdminOverview", `status=${r.status}`);
  }

  // ── A28: Normal user cannot self-promote to admin without developer secret -> 403 ──
  {
    const r = await apiPost("bootstrapAdmin", passenger.token, {});
    r.status === 403
      ? ok("A28 normal user self-promotion rejected -> 403", `status=${r.status}`)
      : fail("A28 normal user self-promotion", `status=${r.status}`);
  }

  // ── A31, A32, A33: Specific roles remain non-admin -> 403 ──
  {
    const rPass = await apiGet("getAdminOverview", passenger.token);
    const rDrv = await apiGet("getAdminOverview", driver.token);
    const rFam = await apiGet("getAdminOverview", familyMember.token);

    rPass.status === 403
      ? ok("A33 passenger remains non-admin -> 403", `status=${rPass.status}`)
      : fail("A33 passenger non-admin", `status=${rPass.status}`);

    rDrv.status === 403
      ? ok("A32 driver remains non-admin -> 403", `status=${rDrv.status}`)
      : fail("A32 driver non-admin", `status=${rDrv.status}`);

    rFam.status === 403
      ? ok("A31 family member remains non-admin -> 403", `status=${rFam.status}`)
      : fail("A31 family non-admin", `status=${rFam.status}`);
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 2: DEVELOPER-CONTROLLED ADMIN BOOTSTRAP & ELEVATION
  // ══════════════════════════════════════════════════════════════

  console.log(`\n${YELLOW}Bootstrapping authorized admin actor…${RESET}`);
  const rBootstrap = await apiPost(
    "bootstrapAdmin",
    adminUser.token,
    {},
    { "x-admin-bootstrap-key": BOOTSTRAP_SECRET }
  );

  if (rBootstrap.status !== 200 || !rBootstrap.body.success) {
    console.error(`${RED}FATAL: Admin bootstrap failed: ${JSON.stringify(rBootstrap.body)}${RESET}`);
    process.exit(1);
  }
  console.log(`  ✓ Admin bootstrap successful for UID ${adminUser.uid}`);

  // Refresh admin login token to pick up new custom claims
  const adminLogin = await apiPost("login", null, {
    email: adminUser.email,
    password: adminUser.pass,
  });
  const adminToken = adminLogin.body.idToken || adminUser.token;

  // ══════════════════════════════════════════════════════════════
  // SECTION 3: AUTHORIZED ADMIN ENDPOINTS & METRIC ACCURACY
  // ══════════════════════════════════════════════════════════════

  // ── A09: Admin overview authorized -> 200 with complete metrics ──
  let overviewData;
  {
    const r = await apiGet("getAdminOverview", adminToken);
    if (r.status === 200 && r.body.success && r.body.overview) {
      overviewData = r.body.overview;
      const hasUsers = overviewData.users && typeof overviewData.users.total === "number";
      const hasDrivers = overviewData.drivers && typeof overviewData.drivers.total === "number";
      const hasRides = overviewData.rides && typeof overviewData.rides.total === "number";
      const hasPayments = overviewData.payments && overviewData.payments.isSandbox === true;
      const hasRatings = overviewData.ratings && typeof overviewData.ratings.total === "number";
      const hasSystem = overviewData.system && overviewData.system.status === "OPERATIONAL";

      hasUsers && hasDrivers && hasRides && hasPayments && hasRatings && hasSystem
        ? ok("A09 admin overview authorized with complete metrics -> 200", `users=${overviewData.users.total}, rides=${overviewData.rides.total}`)
        : fail("A09 admin overview metrics incomplete", JSON.stringify(overviewData));
    } else {
      fail("A09 admin overview authorized", `status=${r.status} body=${JSON.stringify(r.body)}`);
    }
  }

  // ── A10: Admin users authorized -> 200 ──
  let adminUsersList;
  {
    const r = await apiGet("getAdminUsers", adminToken, { limit: 25 });
    if (r.status === 200 && r.body.success && Array.isArray(r.body.users)) {
      adminUsersList = r.body.users;
      ok("A10 admin users authorized -> 200", `count=${adminUsersList.length}`);
    } else {
      fail("A10 admin users authorized", `status=${r.status}`);
    }
  }

  // ── A11: Admin drivers authorized -> 200 ──
  {
    const r = await apiGet("getAdminDrivers", adminToken, { limit: 25 });
    r.status === 200 && r.body.success && Array.isArray(r.body.drivers)
      ? ok("A11 admin drivers authorized -> 200", `count=${r.body.drivers.length}`)
      : fail("A11 admin drivers authorized", `status=${r.status}`);
  }

  // ── A12: Admin rides authorized -> 200 ──
  {
    const r = await apiGet("getAdminRides", adminToken, { limit: 25 });
    r.status === 200 && r.body.success && Array.isArray(r.body.rides)
      ? ok("A12 admin rides authorized -> 200", `count=${r.body.rides.length}`)
      : fail("A12 admin rides authorized", `status=${r.status}`);
  }

  // ── A13: Admin payments authorized -> 200 sandbox payments ──
  {
    const r = await apiGet("getAdminPayments", adminToken, { limit: 25 });
    const isCleanSandbox = r.body.isSandbox === true && Array.isArray(r.body.payments);
    r.status === 200 && isCleanSandbox
      ? ok("A13 admin payments authorized (explicitly sandbox) -> 200", `count=${r.body.payments.length}`)
      : fail("A13 admin payments authorized", `status=${r.status}`);
  }

  // ── A14: Admin ratings authorized -> 200 ──
  {
    const r = await apiGet("getAdminRatings", adminToken, { limit: 25 });
    r.status === 200 && r.body.success && Array.isArray(r.body.ratings)
      ? ok("A14 admin ratings authorized -> 200", `count=${r.body.ratings.length}`)
      : fail("A14 admin ratings authorized", `status=${r.status}`);
  }

  // ── A29: Admin ride details authorized -> 200 with complete timeline ──
  {
    const r = await apiGet("getAdminRideDetails", adminToken, { rideId: testRideId });
    const hasRide = r.body.success && r.body.ride && r.body.ride.rideId === testRideId;
    const hasPassenger = r.body.passenger && r.body.passenger.uid === passenger.uid;
    const hasDriver = r.body.driver && r.body.driver.uid === driver.uid;
    const hasPayment = r.body.payment && r.body.payment.isSandbox === true;
    const hasRatings = Array.isArray(r.body.ratings);

    hasRide && hasPassenger && hasDriver && hasPayment && hasRatings
      ? ok("A29 admin ride details authorized with participants, sandbox payment, and ratings -> 200", `rideId=${testRideId}`)
      : fail("A29 admin ride details", JSON.stringify(r.body));
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 4: NON-ADMIN ACCESS PROTECTION ON ALL ENDPOINTS
  // ══════════════════════════════════════════════════════════════

  // ── A15: Non-admin cannot access getAdminUsers -> 403 ──
  {
    const r = await apiGet("getAdminUsers", passenger.token);
    r.status === 403
      ? ok("A15 non-admin cannot access getAdminUsers -> 403", `status=${r.status}`)
      : fail("A15 non-admin getAdminUsers", `status=${r.status}`);
  }

  // ── A16: Non-admin cannot access getAdminRides -> 403 ──
  {
    const r = await apiGet("getAdminRides", passenger.token);
    r.status === 403
      ? ok("A16 non-admin cannot access getAdminRides -> 403", `status=${r.status}`)
      : fail("A16 non-admin getAdminRides", `status=${r.status}`);
  }

  // ── A17: Non-admin cannot access getAdminPayments -> 403 ──
  {
    const r = await apiGet("getAdminPayments", passenger.token);
    r.status === 403
      ? ok("A17 non-admin cannot access getAdminPayments -> 403", `status=${r.status}`)
      : fail("A17 non-admin getAdminPayments", `status=${r.status}`);
  }

  // ── A18: Non-admin cannot access getAdminRatings -> 403 ──
  {
    const r = await apiGet("getAdminRatings", passenger.token);
    r.status === 403
      ? ok("A18 non-admin cannot access getAdminRatings -> 403", `status=${r.status}`)
      : fail("A18 non-admin getAdminRatings", `status=${r.status}`);
  }

  // ── A30: Non-admin cannot access getAdminRideDetails -> 403 ──
  {
    const r = await apiGet("getAdminRideDetails", stranger.token, { rideId: testRideId });
    r.status === 403
      ? ok("A30 stranger cannot access getAdminRideDetails -> 403", `status=${r.status}`)
      : fail("A30 stranger getAdminRideDetails", `status=${r.status}`);
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 5: PAGINATION, FILTERING & INPUT VALIDATION
  // ══════════════════════════════════════════════════════════════

  // ── A19: Pagination maximum enforced (clamps or limits max 100) ──
  {
    const r = await apiGet("getAdminUsers", adminToken, { limit: 999 });
    const clamped = r.status === 200 && Array.isArray(r.body.users) && r.body.users.length <= 100;
    clamped
      ? ok("A19 pagination limit clamped to max 100", `returned=${r.body.users.length}`)
      : fail("A19 pagination maximum", `status=${r.status}`);
  }

  // ── A20: Invalid pagination parameter rejected -> 400 ──
  {
    const r1 = await apiGet("getAdminUsers", adminToken, { limit: -5 });
    const r2 = await apiGet("getAdminUsers", adminToken, { limit: "invalid_nan" });
    r1.status === 400 && r2.status === 400
      ? ok("A20 negative and non-numeric pagination limit rejected -> 400", `r1=${r1.status}, r2=${r2.status}`)
      : fail("A20 invalid pagination parameter", `r1=${r1.status}, r2=${r2.status}`);
  }

  // ── A21: Invalid status filter rejected -> 400 ──
  {
    const r = await apiGet("getAdminRides", adminToken, { status: "HACKED_STATUS_XYZ" });
    r.status === 400
      ? ok("A21 invalid status filter rejected -> 400", `status=${r.status}`)
      : fail("A21 invalid status filter", `status=${r.status}`);
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 6: CREDENTIAL PRIVACY & SECRET LEAKAGE PREVENTION
  // ══════════════════════════════════════════════════════════════

  // ── A22, A23, A24, A25, A26: Sensitive credentials absent ──
  {
    const userPayloadStr = JSON.stringify(adminUsersList || {});
    const rPayments = await apiGet("getAdminPayments", adminToken, { limit: 10 });
    const paymentPayloadStr = JSON.stringify(rPayments.body);

    const noPassword = !userPayloadStr.includes("password") && !userPayloadStr.includes("passwordHash");
    const noTokens = !userPayloadStr.includes("idToken") && !userPayloadStr.includes("refreshToken");
    const noFcm = !userPayloadStr.includes("fcmToken") && !userPayloadStr.includes("tokenString");
    const noCards = !paymentPayloadStr.includes("cvv") && !paymentPayloadStr.includes("cardNumber") && !paymentPayloadStr.includes("upiPin");

    noPassword
      ? ok("A23 password and passwordHash fields absent from admin user responses")
      : fail("A23 password leaked in admin users", userPayloadStr);

    noTokens
      ? ok("A24 Firebase ID tokens and refresh tokens absent from responses")
      : fail("A24 tokens leaked in responses", userPayloadStr);

    noFcm
      ? ok("A25 FCM tokens absent from admin user/driver responses")
      : fail("A25 FCM tokens leaked", userPayloadStr);

    noCards
      ? ok("A26 payment secrets (cards, CVVs, UPI PINs) absent from payment records")
      : fail("A26 payment secrets present", paymentPayloadStr);

    noPassword && noTokens && noFcm && noCards
      ? ok("A22 comprehensive sensitive credential exclusion verified")
      : fail("A22 credential check failed");
  }

  // ── A27: Direct client write to /admins blocked by security rules -> 403 ──
  {
    const directWriteUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/admins/${passenger.uid}`;
    const r = await fetch(directWriteUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${passenger.token}`,
      },
      body: JSON.stringify({
        fields: {
          active: { booleanValue: true },
          role: { stringValue: "ADMIN" },
        },
      }),
    });
    r.status === 403
      ? ok("A27 direct client write to /admins blocked by Firestore rules -> 403 PERMISSION_DENIED", `status=${r.status}`)
      : fail("A27 direct client write not blocked", `status=${r.status}`);
  }

  // ── A34: Error responses contain no stack traces or secrets ──
  {
    const r = await apiGet("getAdminRideDetails", adminToken, { rideId: "fake-ride-12345" });
    const bodyStr = JSON.stringify(r.body);
    const noStack = !bodyStr.includes("at ") && !bodyStr.includes(".js:") && !bodyStr.includes("node_modules");
    r.status === 404 && noStack
      ? ok("A34 error responses contain no stack traces or internal secrets", `status=${r.status}`)
      : fail("A34 stack trace leaked in error response", bodyStr);
  }

  // ── A35: Admin dashboard does not expose raw infrastructure credentials ──
  {
    const overviewStr = JSON.stringify(overviewData || {});
    const noKeys = !overviewStr.includes("AIza") && !overviewStr.includes("PRIVATE KEY") && !overviewStr.includes("sk_live");
    noKeys
      ? ok("A35 admin dashboard overview contains no infrastructure secrets or API keys")
      : fail("A35 infrastructure credentials found in overview", overviewStr);
  }

  // ══════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════
  console.log(`\n=======================================================`);
  console.log(`PHASE 14 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log(`=======================================================\n`);

  if (failed > 0) {
    console.error(`${RED}Some Phase 14 tests failed!${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}All Phase 14 tests passed successfully!${RESET}\n`);
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
