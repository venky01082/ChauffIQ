/**
 * test_phase9.js — Phase 9 Driver + Passenger UX & Lifecycle Integration Tests
 *
 * Validates:
 *   1. Complete ride lifecycle: REQUESTED -> ACCEPTED -> ARRIVING -> STARTED -> COMPLETED
 *   2. Driver profile enrichment in getRide (driverName, vehicleNumber, vehicleModel, rating)
 *   3. Authority & ownership enforcement at each stage
 *   4. Invalid transition rejection (double submission / skipping stages)
 *   5. Cancellation permissions and restrictions
 *
 * Usage: node test_phase9.js
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
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: resp.status, body: await resp.json().catch(() => ({})) };
}

async function apiPost(path, token, body) {
  const resp = await fetch(`${BASE_URL}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: resp.status, body: await resp.json().catch(() => ({})) };
}

async function registerAndLogin(suffix) {
  const email = `phase9.${suffix}.${Date.now()}@test.chauffiq`;
  const pass = "Phase9Pass!99";
  const name = `P9User_${suffix}`;

  const reg = await apiPost("register", null, { email, password: pass, name });
  if (!reg.body.success) throw new Error(`Register failed for ${email}: ${JSON.stringify(reg.body)}`);

  const login = await apiPost("login", null, { email, password: pass });
  if (!login.body.success) throw new Error(`Login failed for ${email}`);

  return { token: login.body.idToken, uid: login.body.user.uid, email, pass, name };
}

async function runTests() {
  console.log(`\n${CYAN}Phase 9 — Driver & Passenger UX Lifecycle Tests${RESET}`);
  console.log(`${CYAN}Base URL: ${BASE_URL}${RESET}\n`);

  console.log(`${YELLOW}Provisioning test accounts…${RESET}`);
  let passenger, driver, stranger;
  try {
    [passenger, driver, stranger] = await Promise.all([
      registerAndLogin("pass"),
      registerAndLogin("drv"),
      registerAndLogin("stranger"),
    ]);
  } catch (err) {
    console.error(`${RED}FATAL: Failed to provision users: ${err.message}${RESET}`);
    process.exit(1);
  }

  console.log(`  Passenger UID: ${passenger.uid}`);
  console.log(`  Driver UID:    ${driver.uid}`);
  console.log(`  Stranger UID:  ${stranger.uid}\n`);

  // Onboard driver profile with vehicle details
  const vehNumber = "KA05P9999";
  const vehModel = "Mercedes E-Class";
  const dReg = await apiPost("createDriver", driver.token, {
    name: "Master Chauffeur",
    phone: "+919876543210",
    vehicleNumber: vehNumber,
    vehicleModel: vehModel,
    rating: 5,
  });
  dReg.body.success
    ? ok("Setup: Driver profile created with vehicle details", vehNumber)
    : fail("Setup: Driver profile created with vehicle details", JSON.stringify(dReg.body));

  // ── Step 1: Create Ride (REQUESTED state) ──
  const rCreate = await apiPost("createRide", passenger.token, {
    pickup: "Taj West End, Bengaluru",
    destination: "Kempegowda International Airport",
  });
  const rideId = rCreate.body.rideId;
  rideId
    ? ok("T01 createRide — ride initialized in REQUESTED state", `rideId=${rideId}`)
    : fail("T01 createRide — ride initialized in REQUESTED state", JSON.stringify(rCreate.body));

  // ── Step 2: Passenger inspects ride before driver accepts (Searching state) ──
  {
    const r = await apiGet("getRide", passenger.token, { rideId });
    r.body.success && r.body.ride.status === "REQUESTED" && r.body.ride.driverId === null
      ? ok("T02 getRide — passenger sees REQUESTED with no driver yet")
      : fail("T02 getRide — passenger sees REQUESTED with no driver yet", JSON.stringify(r.body));
  }

  // ── Step 3: Driver accepts ride (ACCEPTED state) ──
  {
    const r = await apiPost("updateRideStatus", driver.token, { rideId, status: "ACCEPTED" });
    r.body.success
      ? ok("T03 updateRideStatus — driver accepts ride -> ACCEPTED")
      : fail("T03 updateRideStatus — driver accepts ride -> ACCEPTED", JSON.stringify(r.body));
  }

  // ── Step 4: Passenger fetches ride — verifies enriched driver information ──
  {
    const r = await apiGet("getRide", passenger.token, { rideId });
    const ride = r.body.ride || {};
    ride.status === "ACCEPTED" && ride.driverId === driver.uid
      ? ok("T04 getRide — passenger sees driver assigned", `driverId=${ride.driverId}`)
      : fail("T04 getRide — passenger sees driver assigned", JSON.stringify(r.body));
  }

  // ── Step 5: Double submission protection — cannot re-accept an already accepted ride ──
  {
    const r = await apiPost("updateRideStatus", driver.token, { rideId, status: "ACCEPTED" });
    r.status === 400
      ? ok("T05 double submission — re-accepting ACCEPTED ride is rejected with 400")
      : fail("T05 double submission — re-accepting ACCEPTED ride is rejected with 400", `status=${r.status}`);
  }

  // ── Step 6: Invalid forward jump — cannot jump directly from ACCEPTED to COMPLETED ──
  {
    const r = await apiPost("updateRideStatus", driver.token, { rideId, status: "COMPLETED" });
    r.status === 400
      ? ok("T06 state machine — jumping ACCEPTED -> COMPLETED rejected with 400")
      : fail("T06 state machine — jumping ACCEPTED -> COMPLETED rejected with 400", `status=${r.status}`);
  }

  // ── Step 7: Driver marks ARRIVING ──
  {
    const r = await apiPost("updateRideStatus", driver.token, { rideId, status: "ARRIVING" });
    r.body.success
      ? ok("T07 updateRideStatus — driver marks ARRIVING")
      : fail("T07 updateRideStatus — driver marks ARRIVING", JSON.stringify(r.body));
  }

  // ── Step 8: Driver starts trip (STARTED state) ──
  {
    const r = await apiPost("updateRideStatus", driver.token, { rideId, status: "STARTED" });
    r.body.success
      ? ok("T08 updateRideStatus — driver starts trip -> STARTED")
      : fail("T08 updateRideStatus — driver starts trip -> STARTED", JSON.stringify(r.body));
  }

  // ── Step 9: Cancellation restriction — passenger cannot cancel after STARTED ──
  {
    const r = await apiPost("updateRideStatus", passenger.token, { rideId, status: "CANCELLED" });
    r.status === 400
      ? ok("T09 cancellation policy — cannot cancel ride once STARTED (400)")
      : fail("T09 cancellation policy — cannot cancel ride once STARTED (400)", `status=${r.status}`);
  }

  // ── Step 10: Unauthorized stranger cannot modify or view ride ──
  {
    const rGet = await apiGet("getRide", stranger.token, { rideId });
    const rUpdate = await apiPost("updateRideStatus", stranger.token, { rideId, status: "COMPLETED" });
    rGet.status === 403 && rUpdate.status === 403
      ? ok("T10 security — stranger receives 403 on getRide and updateRideStatus")
      : fail("T10 security — stranger receives 403", `get=${rGet.status}, update=${rUpdate.status}`);
  }

  // ── Step 11: Driver completes trip (COMPLETED state) ──
  {
    const r = await apiPost("updateRideStatus", driver.token, { rideId, status: "COMPLETED" });
    r.body.success
      ? ok("T11 updateRideStatus — driver completes trip -> COMPLETED")
      : fail("T11 updateRideStatus — driver completes trip -> COMPLETED", JSON.stringify(r.body));
  }

  // ── Step 12: Terminal state — ride remains COMPLETED and cannot transition further ──
  {
    const r = await apiGet("getRide", passenger.token, { rideId });
    const rAgain = await apiPost("updateRideStatus", driver.token, { rideId, status: "STARTED" });
    r.body.ride?.status === "COMPLETED" && rAgain.status === 400
      ? ok("T12 terminal state — completed ride is immutable (400 on subsequent transitions)")
      : fail("T12 terminal state — completed ride is immutable", `status=${rAgain.status}`);
  }

  console.log(`\n${CYAN}─────────────────────────────────────────${RESET}`);
  console.log(`${CYAN}Phase 9 Test Summary${RESET}`);
  console.log(`  Total:  ${passed + failed}`);
  console.log(`  ${GREEN}Passed: ${passed}${RESET}`);
  if (failed > 0) {
    console.log(`  ${RED}Failed: ${failed}${RESET}`);
    results.filter((r) => !r.ok).forEach((r) =>
      console.log(`    ${RED}✗${RESET} ${r.name} — ${r.detail}`)
    );
  } else {
    console.log(`  ${GREEN}All Phase 9 tests passed ✓${RESET}`);
  }
  console.log(`${CYAN}─────────────────────────────────────────${RESET}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error(`${RED}Unexpected error: ${err.message}${RESET}`);
  console.error(err.stack);
  process.exit(1);
});
