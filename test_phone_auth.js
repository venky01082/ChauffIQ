/**
 * Phase 7A Phone Authentication & Backend Compatibility Test Suite
 * Tests the syncUser endpoint, token verification, profile synchronization,
 * and interoperability with existing ride-hailing endpoints.
 */

const { createChauffIQClient, ApiClientError } = require("./client");

const BASE_URL = "http://127.0.0.1:5001/chauffiq-a0366/asia-southeast1";
const AUTH_EMULATOR_HOST = "127.0.0.1:9099";

async function runPhoneAuthTests() {
  console.log("==========================================================");
  console.log("CHAUFFIQ PHASE 7A: PHONE AUTHENTICATION TEST SUITE");
  console.log("==========================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  const client = createChauffIQClient({ baseUrl: BASE_URL });

  // -------------------------------------------------------------
  // Test 1: syncUser rejects unauthenticated request (401)
  // -------------------------------------------------------------
  try {
    await client.auth.syncUser({ name: "Unauthenticated" });
    assert(false, "Test 1: syncUser should reject unauthenticated request");
  } catch (err) {
    assert(
      err instanceof ApiClientError && err.status === 401,
      "Test 1: syncUser rejects unauthenticated request with 401"
    );
  }

  // -------------------------------------------------------------
  // Test 2: syncUser rejects invalid/garbage Bearer token (401)
  // -------------------------------------------------------------
  try {
    client.auth.setToken("invalid.garbage.token.xyz");
    await client.auth.syncUser({ name: "Attacker" });
    assert(false, "Test 2: syncUser should reject invalid token");
  } catch (err) {
    assert(
      err instanceof ApiClientError && err.status === 401,
      "Test 2: syncUser rejects invalid token with 401"
    );
  } finally {
    client.auth.logout();
  }

  // -------------------------------------------------------------
  // Helper: Create a phone-authenticated Firebase User in Emulator
  // -------------------------------------------------------------
  const timestamp = Date.now();
  const testPhone = `+9198${String(timestamp).slice(-8)}`;

  // Use Auth Emulator REST API to create and retrieve ID token for phone user
  let phoneIdToken = null;
  let phoneUid = null;

  try {
    const res = await fetch(`http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: testPhone,
        returnSecureToken: true,
      }),
    });
    const authData = await res.json();
    phoneIdToken = authData.idToken;
    phoneUid = authData.localId;
  } catch (err) {
    console.error("Failed to generate test phone token:", err);
  }

  assert(!!phoneIdToken && !!phoneUid, "Setup: Generated valid Firebase ID token for phone user");

  // -------------------------------------------------------------
  // Test 3: syncUser creates profile for new phone user (HTTP 201)
  // -------------------------------------------------------------
  client.auth.setToken(phoneIdToken);
  let syncedUser = null;
  try {
    const syncRes = await client.auth.syncUser({
      name: "Phone Passenger Sam",
      role: "PASSENGER",
    });
    syncedUser = syncRes.user;
    assert(
      syncRes.success === true &&
      syncedUser.uid === phoneUid &&
      syncedUser.name === "Phone Passenger Sam" &&
      syncedUser.role === "PASSENGER",
      "Test 3: syncUser onboards new phone user into Firestore profile"
    );
  } catch (err) {
    assert(false, `Test 3 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 4: Idempotent syncUser updates profile without duplicates
  // -------------------------------------------------------------
  try {
    const syncRes2 = await client.auth.syncUser({
      name: "Phone Passenger Sam Updated",
    });
    assert(
      syncRes2.success === true &&
      syncRes2.user.uid === phoneUid &&
      syncRes2.user.name === "Phone Passenger Sam", // Existing name preserved
      "Test 4: syncUser is idempotent and preserves established profile data"
    );
  } catch (err) {
    assert(false, `Test 4 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 5: Phone-authenticated user can book a ride (createRide)
  // -------------------------------------------------------------
  let rideId = null;
  try {
    const rideRes = await client.rides.createRide({
      pickup: "Downtown Metro Station",
      destination: "Airport Gate 2",
    });
    rideId = rideRes.rideId;
    assert(
      rideRes.success === true && !!rideId,
      "Test 5: Phone-authenticated user successfully creates ride using Bearer token"
    );
  } catch (err) {
    assert(false, `Test 5 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 6: Phone-authenticated user can retrieve their ride (getRide)
  // -------------------------------------------------------------
  try {
    const getRes = await client.rides.getRide(rideId);
    assert(
      getRes.success === true &&
      getRes.ride.passengerId === phoneUid &&
      getRes.ride.status === "REQUESTED",
      "Test 6: Phone-authenticated user retrieves their ride (ownership verified)"
    );
  } catch (err) {
    assert(false, `Test 6 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 7: Unauthorized stranger blocked from phone user's ride
  // -------------------------------------------------------------
  const strangerClient = createChauffIQClient({ baseUrl: BASE_URL });
  const strangerEmail = `stranger_p_${timestamp}@test.com`;
  try {
    await strangerClient.auth.register({
      email: strangerEmail,
      password: "password123",
      name: "Stranger",
      role: "PASSENGER",
    });
    await strangerClient.auth.login({ email: strangerEmail, password: "password123" });

    try {
      await strangerClient.rides.getRide(rideId);
      assert(false, "Test 7: Stranger should be blocked from phone user's ride");
    } catch (err) {
      assert(
        err instanceof ApiClientError && err.status === 403,
        "Test 7: Stranger receives HTTP 403 Forbidden accessing phone user's ride"
      );
    }
  } catch (err) {
    assert(false, `Test 7 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 8: Verify email/password login still works in parallel
  // -------------------------------------------------------------
  try {
    const emailLoginRes = await strangerClient.auth.login({
      email: strangerEmail,
      password: "password123",
    });
    assert(
      emailLoginRes.success === true && !!emailLoginRes.idToken,
      "Test 8: Email/Password login continues to function with zero regressions"
    );
  } catch (err) {
    assert(false, `Test 8 failed: ${err.message}`);
  }

  console.log("==========================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhoneAuthTests();
