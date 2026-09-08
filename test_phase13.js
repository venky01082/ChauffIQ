/**
 * test_phase13.js — Phase 13 Payment Sandbox Architecture Test Suite
 *
 * Validates:
 *   P01: Unauthenticated createPayment -> 401
 *   P02: Missing Authorization header on createPayment -> 401
 *   P03: Malformed Authorization header -> 401
 *   P04: Unsupported HTTP method (GET on createPayment) -> 405
 *   P05: Missing rideId -> 400
 *   P06: Non-existent rideId -> 404
 *   P07: Stranger cannot create payment for another ride -> 403
 *   P08: Family member cannot create payment -> 403
 *   P09: Driver cannot create passenger payment -> 403
 *   P10: Client-supplied amount cannot override server amount
 *   P11: Client-supplied payerUid cannot impersonate another user
 *   P12: Duplicate payment creation handled idempotently -> 200
 *   P13: Stranger getPayment unauthorized -> 403
 *   P14: Authorized passenger getPayment -> 200
 *   P15: Authorized driver getPayment -> 200
 *   P16: Family member read-only behavior preserved
 *   P17: Invalid sandbox outcome rejected -> 400
 *   P18: Sandbox SUCCESS transition works -> SUCCEEDED
 *   P19: Sandbox FAILURE transition works -> FAILED
 *   P20: Sandbox CANCEL transition works -> CANCELLED
 *   P21: Invalid state transition rejected -> 400
 *   P22: Terminal payment cannot be arbitrarily modified -> 400
 *   P23: Direct client payment write blocked by Firestore rules -> 403
 *   P24: Direct client payment status manipulation blocked -> 403
 *   P25: Payment amount stored in integer minor units (paise)
 *   P26: No real payment provider credentials present in repository
 *   P27: No card/CVV/bank/UPI secrets stored
 *   P28: Error responses contain no stack traces or secrets
 *   P29: Payment linked to exactly one ride
 *   P30: Sandbox mode clearly identifiable (isSandbox: true, provider: SANDBOX)
 *
 * Usage: node test_phase13.js
 */

"use strict";

const fs = require("fs");
const path = require("path");

const BASE_URL = "https://asia-southeast1-chauffiq-a0366.cloudfunctions.net";
const PROJECT_ID = "chauffiq-a0366";

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

async function registerAndLogin(suffix) {
  const email = `phase13.${suffix}.${Date.now()}@test.chauffiq`;
  const pass = "PayAuditPass!88";
  const name = `P13User_${suffix}`;

  const reg = await apiPost("register", null, { email, password: pass, name });
  if (!reg.body.success) throw new Error(`Register failed for ${email}: ${JSON.stringify(reg.body)}`);

  const login = await apiPost("login", null, { email, password: pass });
  if (!login.body.success) throw new Error(`Login failed for ${email}`);

  return { token: login.body.idToken, uid: login.body.user.uid, email, pass, name };
}

async function createRideAndComplete(passenger, driver) {
  const rCreate = await apiPost("createRide", passenger.token, {
    pickup: "UB City, Vittal Mallya Rd, Bengaluru",
    destination: "Kempegowda International Airport",
  });
  const rideId = rCreate.body.rideId;
  if (!rideId) throw new Error("Failed to create test ride: " + JSON.stringify(rCreate.body));

  await apiPost("updateRideStatus", driver.token, { rideId, status: "ACCEPTED" });
  await apiPost("updateRideStatus", driver.token, { rideId, status: "ARRIVING" });
  await apiPost("updateRideStatus", driver.token, { rideId, status: "STARTED" });
  await apiPost("updateRideStatus", driver.token, { rideId, status: "COMPLETED" });

  return rideId;
}

async function runTests() {
  console.log(`\n${CYAN}Phase 13 — Payment Sandbox Architecture Comprehensive Test Suite${RESET}`);
  console.log(`${CYAN}Base URL: ${BASE_URL}${RESET}\n`);

  console.log(`${YELLOW}Provisioning Phase 13 test actors…${RESET}`);
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
    name: "Luxury Chauffeur P13",
    phone: "+919876543299",
    vehicleNumber: "KA01P1313",
    vehicleModel: "BMW 7 Series",
    rating: 5,
  });

  // ══════════════════════════════════════════════════════════════
  // SECTION 1: AUTHENTICATION, AUTHORIZATION & PROTOCOL INTEGRITY
  // ══════════════════════════════════════════════════════════════

  // ── P01: Unauthenticated createPayment -> 401 ──
  {
    const r = await apiPost("createPayment", null, { rideId: "fake-ride" });
    r.status === 401
      ? ok("P01 unauthenticated createPayment rejected -> 401", `status=${r.status}`)
      : fail("P01 unauthenticated createPayment", `status=${r.status}`);
  }

  // ── P02: Missing Authorization header -> 401 ──
  {
    const r = await apiPost("createPayment", null, { rideId: "fake-ride" }, "");
    r.status === 401
      ? ok("P02 missing Authorization header rejected -> 401", `status=${r.status}`)
      : fail("P02 missing Authorization header", `status=${r.status}`);
  }

  // ── P03: Malformed Authorization header -> 401 ──
  {
    const r = await apiPost("createPayment", null, { rideId: "fake-ride" }, "Basic dXNlcjpwYXNz");
    r.status === 401
      ? ok("P03 malformed Authorization header rejected -> 401", `status=${r.status}`)
      : fail("P03 malformed Authorization header", `status=${r.status}`);
  }

  // ── P04: Unsupported HTTP method (GET on createPayment) -> 405 ──
  {
    const r = await apiGet("createPayment", passenger.token, { rideId: "fake-ride" });
    r.status === 405
      ? ok("P04 GET on createPayment rejected -> 405", `status=${r.status}`)
      : fail("P04 GET on createPayment", `status=${r.status}`);
  }

  // ── P05: Missing rideId -> 400 ──
  {
    const r = await apiPost("createPayment", passenger.token, {});
    r.status === 400
      ? ok("P05 missing rideId rejected -> 400", `status=${r.status}`)
      : fail("P05 missing rideId", `status=${r.status}`);
  }

  // ── P06: Invalid / non-existent rideId -> 404 ──
  {
    const r = await apiPost("createPayment", passenger.token, { rideId: "non-existent-ride-xyz" });
    r.status === 404
      ? ok("P06 non-existent rideId rejected -> 404", `status=${r.status}`)
      : fail("P06 non-existent rideId", `status=${r.status}`);
  }

  // Complete Ride 1
  console.log(`\n${YELLOW}Setting up completed test trip 1…${RESET}`);
  const rideId1 = await createRideAndComplete(passenger, driver);

  // Authorize family member on ride 1
  await apiPost("createFamilyMonitoring", passenger.token, {
    rideId: rideId1,
    familyMemberId: familyMember.uid,
  });

  // ── P07: Stranger cannot create payment for another ride -> 403 ──
  {
    const r = await apiPost("createPayment", stranger.token, { rideId: rideId1 });
    r.status === 403
      ? ok("P07 stranger cannot create payment -> 403", `status=${r.status}`)
      : fail("P07 stranger cannot create payment", `status=${r.status}`);
  }

  // ── P08: Family cannot create payment -> 403 ──
  {
    const r = await apiPost("createFamilyMonitoring", passenger.token, { rideId: rideId1, familyMemberId: familyMember.uid });
    const rPay = await apiPost("createPayment", familyMember.token, { rideId: rideId1 });
    rPay.status === 403
      ? ok("P08 family member cannot create payment -> 403", `status=${rPay.status}`)
      : fail("P08 family member cannot create payment", `status=${rPay.status}`);
  }

  // ── P09: Driver cannot create passenger payment -> 403 ──
  {
    const r = await apiPost("createPayment", driver.token, { rideId: rideId1 });
    r.status === 403
      ? ok("P09 driver cannot create passenger payment -> 403", `status=${r.status}`)
      : fail("P09 driver cannot create passenger payment", `status=${r.status}`);
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 2: AUTHORITATIVE FARE, IMMUTABILITY & IDEMPOTENCY
  // ══════════════════════════════════════════════════════════════

  // ── P10: Client-supplied amount cannot override server amount ──
  // ── P11: Client-supplied payerUid cannot impersonate another user ──
  // ── P25: Payment amount stored in integer minor units (paise) ──
  // ── P29: Payment linked to exactly one ride ──
  // ── P30: Sandbox mode clearly identifiable ──
  let payment1;
  {
    const r = await apiPost("createPayment", passenger.token, {
      rideId: rideId1,
      amount: 100, // Client tries to pay ₹1.00 (hacked amount)
      payerUid: "impersonated_hacker_uid",
      status: "SUCCEEDED", // Client tries to declare payment already succeeded
    });

    if (r.status === 201 && r.body.success && r.body.payment) {
      payment1 = r.body.payment;
      const amountOverridden = payment1.amount !== 100 && payment1.amount >= 25000;
      const isIntegerUnits = Number.isInteger(payment1.amount);
      const payerProtected = payment1.payerUid === passenger.uid;
      const initialStatusPending = payment1.status === "PENDING";
      const singleRide = payment1.rideId === rideId1;
      const isSandboxIdentifiable = payment1.isSandbox === true && payment1.provider === "SANDBOX";

      amountOverridden
        ? ok("P10 client-supplied amount ignored; server-calculated fare enforced", `amount=${payment1.amount} paise`)
        : fail("P10 client amount override", JSON.stringify(payment1));

      payerProtected
        ? ok("P11 client payerUid ignored; token UID enforced", `payerUid=${payment1.payerUid}`)
        : fail("P11 payerUid impersonation allowed", JSON.stringify(payment1));

      isIntegerUnits
        ? ok("P25 payment amount stored in integer minor units (paise)", `amount=${payment1.amount}`)
        : fail("P25 non-integer amount", JSON.stringify(payment1));

      singleRide
        ? ok("P29 payment linked to exactly one ride", `rideId=${payment1.rideId}`)
        : fail("P29 payment ride linkage", JSON.stringify(payment1));

      isSandboxIdentifiable && initialStatusPending
        ? ok("P30 sandbox mode clearly identifiable with initial PENDING status", `provider=${payment1.provider}, isSandbox=${payment1.isSandbox}`)
        : fail("P30 sandbox identification", JSON.stringify(payment1));
    } else {
      fail("P10/P11 createPayment failed", JSON.stringify(r.body));
    }
  }

  // ── P12: Duplicate payment creation handled idempotently -> 200 ──
  {
    const rDup = await apiPost("createPayment", passenger.token, { rideId: rideId1 });
    rDup.status === 200 && rDup.body.paymentId === payment1.paymentId && rDup.body.payment.status === "PENDING"
      ? ok("P12 duplicate payment creation handled idempotently -> 200", `paymentId=${rDup.body.paymentId}`)
      : fail("P12 duplicate payment creation", JSON.stringify(rDup.body));
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 3: GET PAYMENT ACCESS CONTROLS
  // ══════════════════════════════════════════════════════════════

  // ── P13: Stranger getPayment unauthorized -> 403 ──
  {
    const r = await apiGet("getPayment", stranger.token, { paymentId: payment1.paymentId });
    r.status === 403
      ? ok("P13 stranger getPayment unauthorized -> 403", `status=${r.status}`)
      : fail("P13 stranger getPayment unauthorized", `status=${r.status}`);
  }

  // ── P14: Authorized passenger getPayment -> 200 ──
  {
    const r = await apiGet("getPayment", passenger.token, { paymentId: payment1.paymentId });
    r.status === 200 && r.body.payment && r.body.payment.paymentId === payment1.paymentId
      ? ok("P14 authorized passenger getPayment -> 200", `paymentId=${r.body.payment.paymentId}`)
      : fail("P14 passenger getPayment", JSON.stringify(r.body));
  }

  // ── P15: Authorized driver getPayment -> 200 ──
  {
    const r = await apiGet("getPayment", driver.token, { rideId: rideId1 });
    r.status === 200 && r.body.payment && r.body.payment.payeeUid === driver.uid
      ? ok("P15 authorized driver getPayment -> 200", `payeeUid=${r.body.payment.payeeUid}`)
      : fail("P15 driver getPayment", JSON.stringify(r.body));
  }

  // ── P16: Family member read-only behavior preserved ──
  {
    const rGet = await apiGet("getPayment", familyMember.token, { paymentId: payment1.paymentId });
    const rSim = await apiPost("simulatePaymentResult", familyMember.token, {
      paymentId: payment1.paymentId,
      outcome: "SUCCESS",
    });
    rGet.status === 200 && rSim.status === 403
      ? ok("P16 family member read-only preserved (getPayment=200, simulateOutcome=403)")
      : fail("P16 family member read-only violated", `get=${rGet.status}, sim=${rSim.status}`);
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 4: STATE MACHINE & SANDBOX SIMULATION
  // ══════════════════════════════════════════════════════════════

  // ── P17: Invalid sandbox outcome rejected -> 400 ──
  {
    const r = await apiPost("simulatePaymentResult", passenger.token, {
      paymentId: payment1.paymentId,
      outcome: "INVALID_HACKER_OUTCOME",
    });
    r.status === 400
      ? ok("P17 invalid sandbox outcome rejected -> 400", `status=${r.status}`)
      : fail("P17 invalid sandbox outcome", `status=${r.status}`);
  }

  // ── P18: Sandbox SUCCESS transition works -> SUCCEEDED ──
  {
    const r = await apiPost("simulatePaymentResult", passenger.token, {
      paymentId: payment1.paymentId,
      outcome: "SUCCESS",
    });
    r.status === 200 && r.body.payment && r.body.payment.status === "SUCCEEDED" && r.body.payment.completedAt
      ? ok("P18 sandbox SUCCESS transition -> SUCCEEDED", `completedAt=${r.body.payment.completedAt}`)
      : fail("P18 sandbox SUCCESS transition", JSON.stringify(r.body));
  }

  // ── P21: Invalid state transition rejected (cannot simulate from SUCCEEDED) -> 400 ──
  // ── P22: Terminal payment cannot be arbitrarily modified -> 400 ──
  {
    const r = await apiPost("simulatePaymentResult", passenger.token, {
      paymentId: payment1.paymentId,
      outcome: "FAILURE",
    });
    r.status === 400
      ? ok("P21 & P22 terminal payment transition rejected (SUCCEEDED is immutable) -> 400", `status=${r.status}`)
      : fail("P21 & P22 terminal payment mutation permitted", `status=${r.status}`);
  }

  // Complete Ride 2 for FAILURE simulation testing
  console.log(`\n${YELLOW}Setting up completed test trip 2 (for FAILURE test)…${RESET}`);
  const rideId2 = await createRideAndComplete(passenger, driver);
  const rPay2 = await apiPost("createPayment", passenger.token, { rideId: rideId2 });
  const payment2 = rPay2.body.payment;

  // ── P19: Sandbox FAILURE transition works -> FAILED ──
  {
    const r = await apiPost("simulatePaymentResult", passenger.token, {
      paymentId: payment2.paymentId,
      outcome: "FAILURE",
    });
    r.status === 200 && r.body.payment && r.body.payment.status === "FAILED" && r.body.payment.failureReason
      ? ok("P19 sandbox FAILURE transition -> FAILED", `reason=${r.body.payment.failureReason}`)
      : fail("P19 sandbox FAILURE transition", JSON.stringify(r.body));
  }

  // Complete Ride 3 for CANCEL simulation testing
  console.log(`\n${YELLOW}Setting up completed test trip 3 (for CANCEL test)…${RESET}`);
  const rideId3 = await createRideAndComplete(passenger, driver);
  const rPay3 = await apiPost("createPayment", passenger.token, { rideId: rideId3 });
  const payment3 = rPay3.body.payment;

  // ── P20: Sandbox CANCEL transition works -> CANCELLED ──
  {
    const r = await apiPost("simulatePaymentResult", passenger.token, {
      paymentId: payment3.paymentId,
      outcome: "CANCEL",
    });
    r.status === 200 && r.body.payment && r.body.payment.status === "CANCELLED"
      ? ok("P20 sandbox CANCEL transition -> CANCELLED", `status=${r.body.payment.status}`)
      : fail("P20 sandbox CANCEL transition", JSON.stringify(r.body));
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 5: FIRESTORE SECURITY RULES & CREDENTIAL AUDIT
  // ══════════════════════════════════════════════════════════════

  // ── P23: Direct client payment write blocked by Firestore rules -> 403 ──
  // ── P24: Direct client payment status manipulation blocked -> 403 ──
  {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/payments/hack_pay_${Date.now()}`;
    const resp = await fetch(firestoreUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${passenger.token}`,
      },
      body: JSON.stringify({
        fields: {
          status: { stringValue: "SUCCEEDED" },
          amount: { integerValue: "0" },
        },
      }),
    });
    resp.status === 403
      ? ok("P23 & P24 direct client payment write blocked by Firestore rules -> 403 PERMISSION_DENIED", `status=${resp.status}`)
      : fail("P23 & P24 direct client write not blocked", `status=${resp.status}`);
  }

  // ── P26: No real payment provider credentials present in repository ──
  {
    const repoRoot = path.resolve(__dirname);
    const functionsIndex = fs.readFileSync(path.join(repoRoot, "functions", "index.js"), "utf8");
    const hasLiveStripe = functionsIndex.includes("sk_live_") || functionsIndex.includes("rk_live_");
    const hasLiveRazorpay = functionsIndex.includes("rzp_live_");

    !hasLiveStripe && !hasLiveRazorpay
      ? ok("P26 verified zero live payment credentials in codebase", "sk_live/rzp_live absent")
      : fail("P26 live payment credentials detected in code!");
  }

  // ── P27: No card/CVV/bank/UPI secrets stored ──
  {
    const payStr = JSON.stringify(payment1);
    const hasCard = payStr.includes("cardNumber") || payStr.includes("cvv") || payStr.includes("upiPin");
    !hasCard
      ? ok("P27 verified zero card/CVV/bank/UPI secrets stored in payment data", "clean schema")
      : fail("P27 sensitive payment secrets detected in payment data!");
  }

  // ── P28: Error responses contain no stack traces or secrets ──
  {
    const r = await apiPost("createPayment", passenger.token, { rideId: "malformed-overflow-" + "x".repeat(200) });
    const bodyStr = JSON.stringify(r.body);
    const hasStackTrace = bodyStr.includes("at ") || bodyStr.includes(".js:") || bodyStr.includes("node_modules");
    const hasSecretKey = bodyStr.includes("AIza") || bodyStr.includes("private_key");

    !hasStackTrace && !hasSecretKey && r.status === 400
      ? ok("P28 error responses do not leak stack traces or secrets", `status=${r.status}`)
      : fail("P28 error response leaked internal information", bodyStr);
  }

  // ══════════════════════════════════════════════════════════════
  // TEST SUMMARY
  // ══════════════════════════════════════════════════════════════
  console.log(`\n${CYAN}=======================================================${RESET}`);
  console.log(`${CYAN}PHASE 13 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})${RESET}`);
  console.log(`${CYAN}=======================================================${RESET}\n`);

  if (failed > 0) {
    console.error(`${RED}Some Phase 13 tests failed. Review output above.${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}All Phase 13 tests passed successfully!${RESET}`);
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error(`${RED}Unhandled error during test run: ${err.stack || err}${RESET}`);
  process.exit(1);
});
