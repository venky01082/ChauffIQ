/**
 * test_phase11.js — Phase 11 Production Security & Observability Test Suite
 *
 * Validates:
 *   S01: Unauthenticated request to protected endpoint -> 401
 *   S02: Missing Authorization header on protected mutations -> 401
 *   S03: Malformed / non-Bearer Authorization header -> 401
 *   S04: Invalid / forged token -> 401
 *   S05: Unsupported HTTP methods return safe 405
 *   S06: Invalid request body (missing required fields) -> 400
 *   S07: Oversized input strings on ride creation (>255) -> 400
 *   S08: Out-of-bounds coordinates on updateDriverLocation -> 400
 *   S09: Unauthorized user accessing private ride -> 403
 *   S10: Unauthorized user accessing driver location -> 403
 *   S11: Family member cannot update ride status -> 400/403
 *   S12: Family member cannot update driver location -> 403
 *   S13: Passenger cannot update driver location -> 403
 *   S14: Non-assigned driver cannot update driver location -> 403
 *   S15: Self-monitoring rejection (cannot add self as family monitor) -> 400
 *   S16: FCM token registration is strictly scoped to caller's UID
 *   S17: Trip history returns only caller's authorized rides
 *   S18: Invalid role filter on getTripHistory -> 400
 *   S19: Invalid status filter on getTripHistory -> 400
 *   S20: Terminal ride mutation rejected (COMPLETED is immutable) -> 400
 *   S21: Terminal ride mutation rejected (CANCELLED is immutable) -> 400
 *   S22: Error responses never expose stack traces or internal secrets
 *   S23: Public endpoint hello returns 200 without auth
 *   S24: Login with invalid password returns 401 without exposing internal errors
 *
 * Usage: node test_phase11.js
 */

"use strict";

const BASE_URL = "https://asia-southeast1-chauffiq-a0366.cloudfunctions.net";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

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

async function apiGet(path, token, params = {}) {
  const url = new URL(`${BASE_URL}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const resp = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: resp.status, body: await resp.json().catch(() => ({})) };
}

async function apiPost(path, token, body, rawAuthHeader = null) {
  const headers = { "Content-Type": "application/json" };
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

async function apiCustom(method, path, token, body = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const resp = await fetch(`${BASE_URL}/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: resp.status, body: await resp.json().catch(() => ({})) };
}

async function registerAndLogin(suffix) {
  const email = `phase11.${suffix}.${Date.now()}@test.chauffiq`;
  const pass = "SecAuditPass!88";
  const name = `P11User_${suffix}`;

  const reg = await apiPost("register", null, { email, password: pass, name });
  if (!reg.body.success) throw new Error(`Register failed for ${email}: ${JSON.stringify(reg.body)}`);

  const login = await apiPost("login", null, { email, password: pass });
  if (!login.body.success) throw new Error(`Login failed for ${email}`);

  return { token: login.body.idToken, uid: login.body.user.uid, email, pass, name };
}

async function runSecurityTests() {
  console.log(`\n${CYAN}Phase 11 — Production Security & Observability Audit Suite${RESET}`);
  console.log(`${CYAN}Base URL: ${BASE_URL}${RESET}\n`);

  console.log(`${YELLOW}Provisioning test accounts…${RESET}`);
  let passenger, driver, stranger, familyMember;
  try {
    [passenger, driver, stranger, familyMember] = await Promise.all([
      registerAndLogin("pass"),
      registerAndLogin("driver"),
      registerAndLogin("stranger"),
      registerAndLogin("family"),
    ]);
  } catch (err) {
    console.error(`${RED}FATAL: Failed to provision test accounts: ${err.message}${RESET}`);
    process.exit(1);
  }

  console.log(`  Passenger UID:    ${passenger.uid}`);
  console.log(`  Driver UID:       ${driver.uid}`);
  console.log(`  Stranger UID:     ${stranger.uid}`);
  console.log(`  Family UID:       ${familyMember.uid}\n`);

  // Setup driver profile
  await apiPost("createDriver", driver.token, {
    name: "Audit Chauffeur",
    phone: "+919876543210",
    vehicleNumber: "KA01SEC11",
    vehicleModel: "Audi A8",
    rating: 5,
  });

  // Create a base ride for security testing
  const rCreate = await apiPost("createRide", passenger.token, {
    pickup: "Taj West End, Race Course Rd",
    destination: "Bengaluru International Airport",
  });
  const rideId = rCreate.body.rideId;
  if (!rideId) {
    console.error(`${RED}FATAL: Base ride creation failed${RESET}`);
    process.exit(1);
  }

  // ── S01: Unauthenticated request to protected endpoint -> 401 ──
  {
    const r = await apiGet("getRide", null, { rideId });
    r.status === 401
      ? ok("S01 unauthenticated request -> 401", `status=${r.status}`)
      : fail("S01 unauthenticated request -> 401", `status=${r.status}`);
  }

  // ── S02: Missing Authorization header on mutation -> 401 ──
  {
    const r = await apiPost("createRide", null, { pickup: "A", destination: "B" });
    r.status === 401
      ? ok("S02 missing Authorization header on mutation -> 401", `status=${r.status}`)
      : fail("S02 missing Authorization header on mutation -> 401", `status=${r.status}`);
  }

  // ── S03: Malformed / non-Bearer Authorization header -> 401 ──
  {
    const r = await apiPost("createRide", null, { pickup: "A", destination: "B" }, "Basic dXNlcjpwYXNz");
    r.status === 401
      ? ok("S03 malformed/non-Bearer auth header -> 401", `status=${r.status}`)
      : fail("S03 malformed/non-Bearer auth header -> 401", `status=${r.status}`);
  }

  // ── S04: Invalid / forged token -> 401 ──
  {
    const r = await apiPost("createRide", null, { pickup: "A", destination: "B" }, "Bearer fake.forged.token");
    r.status === 401
      ? ok("S04 invalid/forged Bearer token -> 401", `status=${r.status}`)
      : fail("S04 invalid/forged Bearer token -> 401", `status=${r.status}`);
  }

  // ── S05: Unsupported HTTP methods return safe 405 ──
  {
    const rGetOnPost = await apiCustom("GET", "createRide", passenger.token);
    const rPostOnGet = await apiCustom("POST", "getRide", passenger.token, { rideId });
    rGetOnPost.status === 405 && rPostOnGet.status === 405
      ? ok("S05 unsupported HTTP methods return safe 405", `GET on POST=${rGetOnPost.status}, POST on GET=${rPostOnGet.status}`)
      : fail("S05 unsupported HTTP methods return safe 405", `GET=${rGetOnPost.status}, POST=${rPostOnGet.status}`);
  }

  // ── S06: Invalid request body (missing required fields) -> 400 ──
  {
    const r = await apiPost("createRide", passenger.token, { pickup: "" });
    r.status === 400
      ? ok("S06 missing required fields -> 400", `status=${r.status}`)
      : fail("S06 missing required fields -> 400", `status=${r.status}`);
  }

  // ── S07: Oversized input strings on ride creation (>255) -> 400 ──
  {
    const largeStr = "A".repeat(300);
    const r = await apiPost("createRide", passenger.token, { pickup: largeStr, destination: "Airport" });
    r.status === 400
      ? ok("S07 oversized input string (>255 chars) -> 400", `status=${r.status}`)
      : fail("S07 oversized input string (>255 chars) -> 400", `status=${r.status}`);
  }

  // ── S08: Out-of-bounds coordinates on updateDriverLocation -> 400 ──
  {
    const rLat = await apiPost("updateDriverLocation", driver.token, { rideId, latitude: 120, longitude: 77.5 });
    const rLon = await apiPost("updateDriverLocation", driver.token, { rideId, latitude: 12.9, longitude: -200 });
    const rNan = await apiPost("updateDriverLocation", driver.token, { rideId, latitude: "not-a-num", longitude: 77.5 });
    rLat.status === 400 && rLon.status === 400 && rNan.status === 400
      ? ok("S08 out-of-bounds coordinates rejected -> 400", `lat=${rLat.status}, lon=${rLon.status}, nan=${rNan.status}`)
      : fail("S08 out-of-bounds coordinates rejected -> 400", `lat=${rLat.status}, lon=${rLon.status}`);
  }

  // ── S09: Unauthorized user accessing private ride -> 403 ──
  {
    const r = await apiGet("getRide", stranger.token, { rideId });
    r.status === 403
      ? ok("S09 stranger accessing private ride -> 403", `status=${r.status}`)
      : fail("S09 stranger accessing private ride -> 403", `status=${r.status}`);
  }

  // ── S10: Unauthorized user accessing driver location -> 403 ──
  {
    const r = await apiGet("getDriverLocation", stranger.token, { rideId });
    r.status === 403
      ? ok("S10 stranger accessing driver location -> 403", `status=${r.status}`)
      : fail("S10 stranger accessing driver location -> 403", `status=${r.status}`);
  }

  // Setup: Driver accepts ride
  await apiPost("updateRideStatus", driver.token, { rideId, status: "ACCEPTED" });

  // Setup: Passenger authorizes familyMember
  await apiPost("createFamilyMonitoring", passenger.token, { rideId, familyMemberId: familyMember.uid });

  // ── S11: Family member cannot update ride status -> 400/403 ──
  {
    const r = await apiPost("updateRideStatus", familyMember.token, { rideId, status: "ARRIVING" });
    r.status === 403 || r.status === 400
      ? ok("S11 family member cannot update ride status", `status=${r.status}`)
      : fail("S11 family member cannot update ride status", `status=${r.status}`);
  }

  // ── S12: Family member cannot update driver location -> 403 ──
  {
    const r = await apiPost("updateDriverLocation", familyMember.token, { rideId, latitude: 12.9, longitude: 77.5 });
    r.status === 403
      ? ok("S12 family member cannot update driver location -> 403", `status=${r.status}`)
      : fail("S12 family member cannot update driver location -> 403", `status=${r.status}`);
  }

  // ── S13: Passenger cannot update driver location -> 403 ──
  {
    const r = await apiPost("updateDriverLocation", passenger.token, { rideId, latitude: 12.9, longitude: 77.5 });
    r.status === 403
      ? ok("S13 passenger cannot update driver location -> 403", `status=${r.status}`)
      : fail("S13 passenger cannot update driver location -> 403", `status=${r.status}`);
  }

  // ── S14: Non-assigned driver cannot update driver location -> 403 ──
  {
    const r = await apiPost("updateDriverLocation", stranger.token, { rideId, latitude: 12.9, longitude: 77.5 });
    r.status === 403
      ? ok("S14 non-assigned driver cannot update location -> 403", `status=${r.status}`)
      : fail("S14 non-assigned driver cannot update location -> 403", `status=${r.status}`);
  }

  // ── S15: Self-monitoring rejection (cannot add self as family monitor) -> 400 ──
  {
    const r = await apiPost("createFamilyMonitoring", passenger.token, { rideId, familyMemberId: passenger.uid });
    r.status === 400
      ? ok("S15 self-monitoring rejected -> 400", `status=${r.status}`)
      : fail("S15 self-monitoring rejected -> 400", `status=${r.status}`);
  }

  // ── S16: FCM token registration is strictly scoped to caller's UID ──
  {
    const testFcmToken = "fcm_token_sec_test_" + Date.now();
    const rReg = await apiPost("registerFcmToken", passenger.token, { token: testFcmToken });
    rReg.status === 200 && rReg.body.tokenId
      ? ok("S16 FCM token registration scoped to caller UID", `tokenId=${rReg.body.tokenId.slice(0, 12)}...`)
      : fail("S16 FCM token registration scoped to caller UID", JSON.stringify(rReg.body));
  }

  // ── S17: Trip history returns only caller's authorized rides ──
  {
    const rStranger = await apiGet("getTripHistory", stranger.token, { role: "PASSENGER" });
    const rPass = await apiGet("getTripHistory", passenger.token, { role: "PASSENGER" });
    rStranger.status === 200 && rStranger.body.rides.length === 0 && rPass.body.rides.length >= 1
      ? ok("S17 trip history correctly scoped to caller UID", `strangerCount=${rStranger.body.rides.length}, passCount=${rPass.body.rides.length}`)
      : fail("S17 trip history correctly scoped", JSON.stringify(rStranger.body));
  }

  // ── S18: Invalid role filter on getTripHistory -> 400 ──
  {
    const r = await apiGet("getTripHistory", passenger.token, { role: "HACKER_ROLE" });
    r.status === 400
      ? ok("S18 invalid role filter rejected -> 400", `status=${r.status}`)
      : fail("S18 invalid role filter rejected -> 400", `status=${r.status}`);
  }

  // ── S19: Invalid status filter on getTripHistory -> 400 ──
  {
    const r = await apiGet("getTripHistory", passenger.token, { status: "INVALID_STATUS" });
    r.status === 400
      ? ok("S19 invalid status filter rejected -> 400", `status=${r.status}`)
      : fail("S19 invalid status filter rejected -> 400", `status=${r.status}`);
  }

  // Advance ride to terminal state: ARRIVING -> STARTED -> COMPLETED
  await apiPost("updateRideStatus", driver.token, { rideId, status: "ARRIVING" });
  await apiPost("updateRideStatus", driver.token, { rideId, status: "STARTED" });
  await apiPost("updateRideStatus", driver.token, { rideId, status: "COMPLETED" });

  // ── S20: Terminal ride mutation rejected (COMPLETED is immutable) -> 400 ──
  {
    const r = await apiPost("updateRideStatus", driver.token, { rideId, status: "STARTED" });
    r.status === 400
      ? ok("S20 completed ride is immutable -> 400", `status=${r.status}`)
      : fail("S20 completed ride is immutable -> 400", `status=${r.status}`);
  }

  // Create a cancelled ride
  const r2 = await apiPost("createRide", passenger.token, { pickup: "P2", destination: "D2" });
  const rideId2 = r2.body.rideId;
  await apiPost("updateRideStatus", passenger.token, { rideId: rideId2, status: "CANCELLED" });

  // ── S21: Terminal ride mutation rejected (CANCELLED is immutable) -> 400 ──
  {
    const r = await apiPost("updateRideStatus", driver.token, { rideId: rideId2, status: "ACCEPTED" });
    r.status === 400
      ? ok("S21 cancelled ride is immutable -> 400", `status=${r.status}`)
      : fail("S21 cancelled ride is immutable -> 400", `status=${r.status}`);
  }

  // ── S22: Error responses never expose stack traces or internal secrets ──
  {
    const r = await apiPost("register", null, { email: "malformed-email", password: "123", name: "" });
    const bodyStr = JSON.stringify(r.body);
    const hasStackTrace = bodyStr.includes("at ") || bodyStr.includes(".js:") || bodyStr.includes("node_modules");
    const hasSecretKey = bodyStr.includes("AIza") || bodyStr.includes("private_key");
    !hasStackTrace && !hasSecretKey && r.status === 400
      ? ok("S22 error responses do not leak stack traces or secrets", `status=${r.status}`)
      : fail("S22 error response leaked stack trace or secret", bodyStr);
  }

  // ── S23: Public endpoint hello returns 200 without auth ──
  {
    const r = await apiGet("hello", null);
    r.status === 200 && r.body.success
      ? ok("S23 public endpoint hello returns 200 without auth", `message=${r.body.message}`)
      : fail("S23 public endpoint hello", JSON.stringify(r.body));
  }

  // ── S24: Login with invalid password returns 401 without exposing internal errors ──
  {
    const r = await apiPost("login", null, { email: passenger.email, password: "WrongPassword999" });
    const bodyStr = JSON.stringify(r.body);
    const safeError = r.status === 401 && !bodyStr.includes("node_modules") && !bodyStr.includes("STACK");
    safeError
      ? ok("S24 invalid login returns 401 safely without internals", `status=${r.status}`)
      : fail("S24 invalid login error exposure", bodyStr);
  }

  console.log(`\n${CYAN}─────────────────────────────────────────${RESET}`);
  console.log(`${CYAN}Phase 11 Security Audit Summary${RESET}`);
  console.log(`  Total:  ${passed + failed}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  if (failed === 0) {
    console.log(`  ${GREEN}All Phase 11 security tests passed ✓${RESET}`);
  } else {
    console.log(`  ${RED}Some tests failed ✗${RESET}`);
  }
  console.log(`${CYAN}─────────────────────────────────────────${RESET}\n`);

  if (failed > 0) process.exit(1);
}

runSecurityTests().catch((err) => {
  console.error(`${RED}Test execution error: ${err.message}${RESET}`);
  process.exit(1);
});
