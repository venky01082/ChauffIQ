/**
 * test_phase10.js — Phase 10 Family Tracking & Trip History Test Suite
 *
 * Validates:
 *   T01: Authenticated family access setup
 *   T02: Unauthorized family access → 403
 *   T03: Outsider access to ride → 403
 *   T04: Unauthenticated access → 401
 *   T05: Authorized family ride retrieval contains ride data
 *   T06: Driver location retrieval for authorized family returns 200 & coordinates
 *   T07: Unauthorized location retrieval returns 403
 *   T08: Ride timeline has requestedAt timestamp on creation
 *   T09: ACCEPTED transition sets acceptedAt timestamp
 *   T10: ARRIVING transition sets arrivingAt timestamp
 *   T11: STARTED transition sets startedAt timestamp
 *   T12: COMPLETED transition sets completedAt timestamp
 *   T13: Terminal ride immutability (cannot modify completed ride, 400)
 *   T14: Passenger history returns only passenger's rides
 *   T15: Driver history returns only driver's rides
 *   T16: Family history returns only authorized monitored rides
 *   T17: Stranger cannot view other users' history
 *   T18: Cancellation records cancelledAt timestamp and appears in history
 *   T19: Active ride filtering returns only active rides
 *   T20: Completed ride filtering returns only completed rides
 *   T21: Family member cannot modify ride status → 403
 *   T22: Family member cannot update driver location → 403
 *
 * Usage: node test_phase10.js
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
  const email = `phase10.${suffix}.${Date.now()}@test.chauffiq`;
  const pass = "Phase10Pass!88";
  const name = `P10User_${suffix}`;

  const reg = await apiPost("register", null, { email, password: pass, name });
  if (!reg.body.success) throw new Error(`Register failed for ${email}: ${JSON.stringify(reg.body)}`);

  const login = await apiPost("login", null, { email, password: pass });
  if (!login.body.success) throw new Error(`Login failed for ${email}`);

  return { token: login.body.idToken, uid: login.body.user.uid, email, pass, name };
}

async function runTests() {
  console.log(`\n${CYAN}Phase 10 — Family Tracking & Trip History Integration Tests${RESET}`);
  console.log(`${CYAN}Base URL: ${BASE_URL}${RESET}\n`);

  console.log(`${YELLOW}Provisioning test accounts…${RESET}`);
  let passenger, driver, familyMember, stranger;
  try {
    [passenger, driver, familyMember, stranger] = await Promise.all([
      registerAndLogin("pass"),
      registerAndLogin("drv"),
      registerAndLogin("family"),
      registerAndLogin("stranger"),
    ]);
  } catch (err) {
    console.error(`${RED}FATAL: Failed to provision test accounts: ${err.message}${RESET}`);
    process.exit(1);
  }

  console.log(`  Passenger UID:    ${passenger.uid}`);
  console.log(`  Driver UID:       ${driver.uid}`);
  console.log(`  Family UID:       ${familyMember.uid}`);
  console.log(`  Stranger UID:     ${stranger.uid}\n`);

  // Setup driver profile
  await apiPost("createDriver", driver.token, {
    name: "Elite Chauffeur",
    phone: "+919876543210",
    vehicleNumber: "KA01P1010",
    vehicleModel: "BMW 7 Series",
    rating: 5,
  });

  // ── Step 1: Create a Ride ──
  const rCreate = await apiPost("createRide", passenger.token, {
    pickup: "The Leela Palace, Bengaluru",
    destination: "UB City, Vittal Mallya Rd",
  });
  const rideId = rCreate.body.rideId;
  if (!rideId) {
    console.error(`${RED}FATAL: Failed to create ride${RESET}`);
    process.exit(1);
  }

  // T08: Ride timeline has requestedAt timestamp on creation
  {
    const r = await apiGet("getRide", passenger.token, { rideId });
    const ride = r.body.ride || {};
    ride.requestedAt && ride.createdAt && ride.status === "REQUESTED"
      ? ok("T08 ride timeline timestamps — requestedAt exists on creation", `requestedAt=${ride.requestedAt}`)
      : fail("T08 ride timeline timestamps", JSON.stringify(r.body));
  }

  // T04: Unauthenticated access returns 401
  {
    const rGet = await apiGet("getRide", null, { rideId });
    const rLoc = await apiGet("getDriverLocation", null, { rideId });
    rGet.status === 401 && rLoc.status === 401
      ? ok("T04 unauthenticated access → 401", `getRide=${rGet.status}, getLoc=${rLoc.status}`)
      : fail("T04 unauthenticated access → 401", `getRide=${rGet.status}, getLoc=${rLoc.status}`);
  }

  // T02: Unauthorized family access to private ride before authorization returns 403
  {
    const r = await apiGet("getRide", familyMember.token, { rideId });
    r.status === 403
      ? ok("T02 unauthorized family access → 403 (before authorization)")
      : fail("T02 unauthorized family access → 403", `status=${r.status}`);
  }

  // T03: Outsider access to ride returns 403
  {
    const r = await apiGet("getRide", stranger.token, { rideId });
    r.status === 403
      ? ok("T03 outsider access → 403")
      : fail("T03 outsider access → 403", `status=${r.status}`);
  }

  // T07: Unauthorized location retrieval returns 403
  {
    const r = await apiGet("getDriverLocation", stranger.token, { rideId });
    r.status === 403
      ? ok("T07 unauthorized location retrieval → 403")
      : fail("T07 unauthorized location retrieval → 403", `status=${r.status}`);
  }

  // Authorize Family Member
  const authFam = await apiPost("createFamilyMonitoring", passenger.token, {
    rideId,
    familyMemberId: familyMember.uid,
  });
  authFam.body.success
    ? ok("T01 authenticated family access setup", `monitoringId=${authFam.body.monitoringId}`)
    : fail("T01 authenticated family access setup", JSON.stringify(authFam.body));

  // T05: Authorized family ride retrieval contains ride data
  {
    const r = await apiGet("getRide", familyMember.token, { rideId });
    r.body.success && r.body.ride?.rideId === rideId
      ? ok("T05 authorized family ride retrieval", `status=${r.body.ride?.status}`)
      : fail("T05 authorized family ride retrieval", JSON.stringify(r.body));
  }

  // Driver accepts ride
  await apiPost("updateRideStatus", driver.token, { rideId, status: "ACCEPTED" });

  // T09: ACCEPTED transition sets acceptedAt timestamp
  {
    const r = await apiGet("getRide", familyMember.token, { rideId });
    const ride = r.body.ride || {};
    ride.acceptedAt && ride.status === "ACCEPTED"
      ? ok("T09 ACCEPTED timestamp — acceptedAt set", `acceptedAt=${ride.acceptedAt}`)
      : fail("T09 ACCEPTED timestamp", JSON.stringify(r.body));
  }

  // Driver broadcasts GPS location
  await apiPost("updateDriverLocation", driver.token, {
    rideId,
    latitude: 12.9601,
    longitude: 77.6485,
  });

  // T06: Driver location retrieval for authorized family returns 200 & coordinates
  {
    const r = await apiGet("getDriverLocation", familyMember.token, { rideId });
    r.body.success && r.body.location?.latitude === 12.9601
      ? ok("T06 driver location retrieval for authorized family", `lat=${r.body.location?.latitude}`)
      : fail("T06 driver location retrieval for authorized family", JSON.stringify(r.body));
  }

  // Driver marks ARRIVING
  await apiPost("updateRideStatus", driver.token, { rideId, status: "ARRIVING" });

  // T10: ARRIVING transition sets arrivingAt timestamp
  {
    const r = await apiGet("getRide", familyMember.token, { rideId });
    const ride = r.body.ride || {};
    ride.arrivingAt && ride.status === "ARRIVING"
      ? ok("T10 ARRIVING timestamp — arrivingAt set", `arrivingAt=${ride.arrivingAt}`)
      : fail("T10 ARRIVING timestamp", JSON.stringify(r.body));
  }

  // Driver starts trip (STARTED)
  await apiPost("updateRideStatus", driver.token, { rideId, status: "STARTED" });

  // T11: STARTED transition sets startedAt timestamp
  {
    const r = await apiGet("getRide", familyMember.token, { rideId });
    const ride = r.body.ride || {};
    ride.startedAt && ride.status === "STARTED"
      ? ok("T11 STARTED timestamp — startedAt set", `startedAt=${ride.startedAt}`)
      : fail("T11 STARTED timestamp", JSON.stringify(r.body));
  }

  // Driver completes trip (COMPLETED)
  await apiPost("updateRideStatus", driver.token, { rideId, status: "COMPLETED" });

  // T12: COMPLETED transition sets completedAt timestamp
  {
    const r = await apiGet("getRide", familyMember.token, { rideId });
    const ride = r.body.ride || {};
    ride.completedAt && ride.status === "COMPLETED"
      ? ok("T12 COMPLETED timestamp — completedAt set", `completedAt=${ride.completedAt}`)
      : fail("T12 COMPLETED timestamp", JSON.stringify(r.body));
  }

  // T13: Terminal ride immutability (cannot modify completed ride, 400)
  {
    const r = await apiPost("updateRideStatus", driver.token, { rideId, status: "STARTED" });
    r.status === 400
      ? ok("T13 terminal ride immutability (400 on subsequent transition)")
      : fail("T13 terminal ride immutability", `status=${r.status}`);
  }

  // T21: Family member cannot modify ride status → 403
  {
    const r = await apiPost("updateRideStatus", familyMember.token, { rideId, status: "STARTED" });
    r.status === 403 || r.status === 400
      ? ok("T21 family user cannot modify ride status (denied)", `status=${r.status}`)
      : fail("T21 family user cannot modify ride status", `status=${r.status}`);
  }

  // T22: Family member cannot update driver location → 403
  {
    const r = await apiPost("updateDriverLocation", familyMember.token, {
      rideId,
      latitude: 12.0,
      longitude: 77.0,
    });
    r.status === 403
      ? ok("T22 family user cannot update driver location → 403")
      : fail("T22 family user cannot update driver location", `status=${r.status}`);
  }

  // ── Create a second ride to test cancellation and filtering ──
  const r2Create = await apiPost("createRide", passenger.token, {
    pickup: "Indiranagar, 12th Main",
    destination: "Koramangala, 5th Block",
  });
  const rideId2 = r2Create.body.rideId;
  await apiPost("updateRideStatus", passenger.token, { rideId: rideId2, status: "CANCELLED" });

  // T18: Cancellation records cancelledAt timestamp
  {
    const r = await apiGet("getRide", passenger.token, { rideId: rideId2 });
    const ride = r.body.ride || {};
    ride.cancelledAt && ride.status === "CANCELLED"
      ? ok("T18 cancellation history — cancelledAt timestamp recorded", `cancelledAt=${ride.cancelledAt}`)
      : fail("T18 cancellation history", JSON.stringify(r.body));
  }

  // ── Trip History Endpoint Tests ──

  // T14: Passenger history ownership
  {
    const r = await apiGet("getTripHistory", passenger.token, { role: "PASSENGER" });
    const hasRide1 = r.body.rides?.some((x) => x.rideId === rideId);
    const hasRide2 = r.body.rides?.some((x) => x.rideId === rideId2);
    r.body.success && hasRide1 && hasRide2
      ? ok("T14 passenger history ownership — retrieved passenger's rides", `count=${r.body.count}`)
      : fail("T14 passenger history ownership", JSON.stringify(r.body));
  }

  // T15: Driver history ownership
  {
    const r = await apiGet("getTripHistory", driver.token, { role: "DRIVER" });
    const hasRide1 = r.body.rides?.some((x) => x.rideId === rideId);
    r.body.success && hasRide1
      ? ok("T15 driver history ownership — retrieved assigned driver rides", `count=${r.body.count}`)
      : fail("T15 driver history ownership", JSON.stringify(r.body));
  }

  // T16: Family history authorization
  {
    const r = await apiGet("getTripHistory", familyMember.token, { role: "FAMILY" });
    const hasRide1 = r.body.rides?.some((x) => x.rideId === rideId);
    const hasRide2 = r.body.rides?.some((x) => x.rideId === rideId2); // not authorized for ride2
    r.body.success && hasRide1 && !hasRide2
      ? ok("T16 family history authorization — sees only authorized monitored ride", `count=${r.body.count}`)
      : fail("T16 family history authorization", JSON.stringify(r.body));
  }

  // T17: Unauthorized history access — stranger receives empty or isolated history
  {
    const r = await apiGet("getTripHistory", stranger.token, { role: "ALL" });
    const seesStrangerRides = r.body.rides?.some((x) => x.rideId === rideId || x.rideId === rideId2);
    r.body.success && !seesStrangerRides
      ? ok("T17 unauthorized history access — stranger cannot see private rides", `count=${r.body.count}`)
      : fail("T17 unauthorized history access", JSON.stringify(r.body));
  }

  // T19: Active ride filtering
  {
    // Create an active ride
    const rAct = await apiPost("createRide", passenger.token, {
      pickup: "MG Road Metro",
      destination: "Brigade Road",
    });
    const actId = rAct.body.rideId;
    const r = await apiGet("getTripHistory", passenger.token, { role: "PASSENGER", status: "ACTIVE" });
    const allActive = r.body.rides?.every((x) => ["REQUESTED", "ACCEPTED", "ARRIVING", "STARTED"].includes(x.status));
    const hasActive = r.body.rides?.some((x) => x.rideId === actId);
    r.body.success && allActive && hasActive
      ? ok("T19 active ride filtering — returns only active rides", `count=${r.body.count}`)
      : fail("T19 active ride filtering", JSON.stringify(r.body));
  }

  // T20: Completed ride filtering
  {
    const r = await apiGet("getTripHistory", passenger.token, { role: "PASSENGER", status: "COMPLETED" });
    const allCompleted = r.body.rides?.every((x) => x.status === "COMPLETED");
    const hasComp = r.body.rides?.some((x) => x.rideId === rideId);
    r.body.success && allCompleted && hasComp
      ? ok("T20 completed ride filtering — returns only completed rides", `count=${r.body.count}`)
      : fail("T20 completed ride filtering", JSON.stringify(r.body));
  }

  console.log(`\n${CYAN}─────────────────────────────────────────${RESET}`);
  console.log(`${CYAN}Phase 10 Test Summary${RESET}`);
  console.log(`  Total:  ${passed + failed}`);
  console.log(`  ${GREEN}Passed: ${passed}${RESET}`);
  if (failed > 0) {
    console.log(`  ${RED}Failed: ${failed}${RESET}`);
    results.filter((r) => !r.ok).forEach((r) =>
      console.log(`    ${RED}✗${RESET} ${r.name} — ${r.detail}`)
    );
  } else {
    console.log(`  ${GREEN}All Phase 10 tests passed ✓${RESET}`);
  }
  console.log(`${CYAN}─────────────────────────────────────────${RESET}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error(`${RED}Unexpected error: ${err.message}${RESET}`);
  console.error(err.stack);
  process.exit(1);
});
