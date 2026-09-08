/**
 * Phase 7B FCM Push Notification & Token Management Test Suite
 * Tests registerFcmToken endpoint, multi-token registration,
 * idempotency, deletion, unauthenticated access, and integration with createNotification.
 */

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

const admin = require("./functions/node_modules/firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp({ projectId: "chauffiq-a0366" });
}
const db = admin.firestore();

const { createChauffIQClient, ApiClientError } = require("./client");

const BASE_URL = "http://127.0.0.1:5001/chauffiq-a0366/asia-southeast1";
const AUTH_EMULATOR_HOST = "127.0.0.1:9099";

async function runFcmTests() {
  console.log("==========================================================");
  console.log("CHAUFFIQ PHASE 7B: FCM PUSH NOTIFICATION TEST SUITE");
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
  // Test 1: registerFcmToken rejects unauthenticated request (401)
  // -------------------------------------------------------------
  try {
    await client.notifications.registerFcmToken({ token: "test_token_123" });
    assert(false, "Test 1: registerFcmToken should reject unauthenticated request");
  } catch (err) {
    assert(
      err instanceof ApiClientError && err.status === 401,
      "Test 1: registerFcmToken rejects unauthenticated request with 401"
    );
  }

  // -------------------------------------------------------------
  // Test 2: unregisterFcmToken rejects unauthenticated request (401)
  // -------------------------------------------------------------
  try {
    await client.notifications.unregisterFcmToken({ token: "test_token_123" });
    assert(false, "Test 2: unregisterFcmToken should reject unauthenticated request");
  } catch (err) {
    assert(
      err instanceof ApiClientError && err.status === 401,
      "Test 2: unregisterFcmToken rejects unauthenticated request with 401"
    );
  }

  // -------------------------------------------------------------
  // Helper: Create Firebase Users in Emulator
  // -------------------------------------------------------------
  async function createTestUser(email, password) {
    const res = await fetch(`http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const data = await res.json();
    return { uid: data.localId, idToken: data.idToken };
  }

  const timestamp = Date.now();
  const userA = await createTestUser(`fcm_userA_${timestamp}@chauffiq.test`, "TestPass123!");
  const userB = await createTestUser(`fcm_userB_${timestamp}@chauffiq.test`, "TestPass123!");

  // -------------------------------------------------------------
  // Test 3: registerFcmToken rejects empty or invalid token (400)
  // -------------------------------------------------------------
  client.setToken(userA.idToken);
  try {
    await client.notifications.registerFcmToken({ token: "" });
    assert(false, "Test 3: registerFcmToken should reject empty token");
  } catch (err) {
    assert(
      err instanceof ApiClientError && err.status === 400,
      "Test 3: registerFcmToken rejects empty token with 400"
    );
  }

  // -------------------------------------------------------------
  // Test 4: Register token for User A
  // -------------------------------------------------------------
  const testToken1 = `fcm_token_device_alpha_${timestamp}`;
  let reg1;
  try {
    reg1 = await client.notifications.registerFcmToken({
      token: testToken1,
      deviceInfo: { browser: "Chrome", platform: "Windows" },
    });
    assert(
      reg1.success === true && typeof reg1.tokenId === "string",
      "Test 4: registerFcmToken succeeds with 200 and returns tokenId"
    );
  } catch (err) {
    assert(false, `Test 4: registerFcmToken failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 5: Verify Firestore document exists
  // -------------------------------------------------------------
  try {
    const docSnap = await db
      .collection("users")
      .doc(userA.uid)
      .collection("fcmTokens")
      .doc(reg1?.tokenId)
      .get();
    assert(
      docSnap.exists && docSnap.data().token === testToken1,
      "Test 5: Token document exists in Firestore under users/{uid}/fcmTokens/{tokenId}"
    );
  } catch (err) {
    assert(false, `Test 5: Firestore check failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 6: Idempotent token registration
  // -------------------------------------------------------------
  try {
    const reg1Retry = await client.notifications.registerFcmToken({
      token: testToken1,
      deviceInfo: { browser: "Chrome-Updated", platform: "Windows" },
    });
    assert(
      reg1Retry.success === true && reg1Retry.tokenId === reg1.tokenId,
      "Test 6: Idempotent re-registration returns same tokenId without error"
    );
  } catch (err) {
    assert(false, `Test 6: Idempotent re-registration failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 7: Register second device token for User A (multi-device)
  // -------------------------------------------------------------
  const testToken2 = `fcm_token_device_beta_${timestamp}`;
  let reg2;
  try {
    reg2 = await client.notifications.registerFcmToken({
      token: testToken2,
      deviceInfo: { browser: "Safari", platform: "iOS" },
    });
    assert(
      reg2.success === true && reg2.tokenId !== reg1.tokenId,
      "Test 7: Multi-device registration creates distinct tokenId"
    );
  } catch (err) {
    assert(false, `Test 7: Multi-device registration failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 8: Verify User A now has 2 tokens
  // -------------------------------------------------------------
  try {
    const listSnap = await db
      .collection("users")
      .doc(userA.uid)
      .collection("fcmTokens")
      .get();
    assert(
      listSnap.size === 2,
      "Test 8: User A has exactly 2 registered FCM tokens"
    );
  } catch (err) {
    assert(false, `Test 8: Token count check failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 9: User B cannot delete User A's token
  // -------------------------------------------------------------
  client.setToken(userB.idToken);
  try {
    // User B attempts to delete User A's tokenId
    await client.notifications.unregisterFcmToken({ tokenId: reg1.tokenId });
    // Verify User A's token is still intact
    const verifyDoc = await db
      .collection("users")
      .doc(userA.uid)
      .collection("fcmTokens")
      .doc(reg1.tokenId)
      .get();
    assert(
      verifyDoc.exists,
      "Test 9: User B cannot delete User A's token (token document remains intact)"
    );
  } catch (err) {
    assert(false, `Test 9: Cross-user isolation check failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 10: User A unregisters token by tokenId
  // -------------------------------------------------------------
  client.setToken(userA.idToken);
  try {
    const unreg = await client.notifications.unregisterFcmToken({ tokenId: reg2.tokenId });
    assert(unreg.success === true, "Test 10: unregisterFcmToken by tokenId succeeds");

    const checkSnap = await db
      .collection("users")
      .doc(userA.uid)
      .collection("fcmTokens")
      .doc(reg2.tokenId)
      .get();
    assert(!checkSnap.exists, "Test 11: Unregistered token document deleted from Firestore");
  } catch (err) {
    assert(false, `Test 10/11: Unregister check failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 12: User A unregisters token by token string
  // -------------------------------------------------------------
  try {
    const unregToken = await client.notifications.unregisterFcmToken({ token: testToken1 });
    assert(unregToken.success === true, "Test 12: unregisterFcmToken by token string succeeds");

    const checkSnap1 = await db
      .collection("users")
      .doc(userA.uid)
      .collection("fcmTokens")
      .doc(reg1.tokenId)
      .get();
    assert(!checkSnap1.exists, "Test 13: Unregistered token by string deleted from Firestore");
  } catch (err) {
    assert(false, `Test 12/13: Unregister by token string failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 14: createNotification with FCM trigger completes successfully
  // -------------------------------------------------------------
  try {
    const notifRes = await client.notifications.createNotification({
      title: "Ride Confirmed",
      message: "Your ride #123 has been confirmed.",
      type: "RIDE_UPDATE",
    });
    assert(
      notifRes.success === true && typeof notifRes.notificationId === "string",
      "Test 14: createNotification succeeds and creates notification document"
    );
  } catch (err) {
    assert(false, `Test 14: createNotification failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 15: Ride status transition with FCM push trigger
  // -------------------------------------------------------------
  try {
    // Passenger A registers an FCM token
    await client.notifications.registerFcmToken({
      token: `passenger_fcm_token_${timestamp}`,
      deviceInfo: { browser: "Chrome" },
    });

    // Passenger A creates a ride
    const rideRes = await client.rides.createRide({
      pickup: "Downtown Central",
      destination: "Airport Terminal 3",
    });
    const rideId = rideRes.rideId;

    // Driver B accepts the ride -> triggers RIDE_ACCEPTED FCM push to Passenger A
    const driverClient = createChauffIQClient({ baseUrl: BASE_URL });
    driverClient.setToken(userB.idToken);

    const acceptRes = await driverClient.rides.updateRideStatus({
      rideId: rideId,
      status: "ACCEPTED",
    });
    assert(acceptRes.success === true, "Test 15: Driver accepts ride with FCM push dispatch");

    // Driver B transitions to ARRIVING -> triggers DRIVER_ARRIVING FCM push
    const arrivingRes = await driverClient.rides.updateRideStatus({
      rideId: rideId,
      status: "ARRIVING",
    });
    assert(arrivingRes.success === true, "Test 16: Driver arrives with FCM push dispatch");
  } catch (err) {
    assert(false, `Test 15/16: Ride status push triggers failed: ${err.message}`);
  }

  client.clearToken();

  console.log("==========================================================");
  console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runFcmTests().catch((err) => {
  console.error("Test suite runner error:", err);
  process.exit(1);
});
