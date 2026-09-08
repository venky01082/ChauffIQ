/**
 * ChauffIQ Client SDK Integration Tests
 * Runs tests A-L using the client module against the local Firebase emulator.
 */

const {createChauffIQClient, ApiClientError} = require("./client");

const BASE_URL = "http://127.0.0.1:5001/chauffiq-a0366/asia-southeast1";

async function runClientTests() {
  console.log("==========================================================");
  console.log("CHAUFFIQ API CLIENT INTEGRATION TEST SUITE");
  console.log("==========================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // Create separate client instances for passenger, driver, and stranger
  const passengerClient = createChauffIQClient({baseUrl: BASE_URL});
  const driverClient = createChauffIQClient({baseUrl: BASE_URL});
  const strangerClient = createChauffIQClient({baseUrl: BASE_URL});

  const timestamp = Date.now();
  const passengerEmail = `client_p_${timestamp}@test.com`;
  const driverEmail = `client_d_${timestamp}@test.com`;
  const strangerEmail = `client_s_${timestamp}@test.com`;
  const password = "password123";
  const phoneSuffix1 = String(timestamp).slice(-8);
  const phoneSuffix2 = String(timestamp + 1).slice(-8);

  // Test A: hello works without authentication
  try {
    const helloRes = await passengerClient.auth.hello();
    assert(helloRes.success === true && helloRes.message.includes("working"), "Test A: hello works without authentication");
  } catch (err) {
    assert(false, `Test A: hello failed: ${err.message}`);
  }

  // Test B: register works
  let passengerUid = null;
  let driverUid = null;
  try {
    const regP = await passengerClient.auth.register({
      email: passengerEmail,
      password: password,
      name: "Client Passenger",
      phone: `+9190${phoneSuffix1}`,
    });
    passengerUid = regP.user.uid;

    const regD = await driverClient.auth.register({
      email: driverEmail,
      password: password,
      name: "Client Driver",
      phone: `+9190${phoneSuffix2}`,
    });
    driverUid = regD.user.uid;

    await strangerClient.auth.register({
      email: strangerEmail,
      password: password,
      name: "Client Stranger",
    });

    assert(passengerUid && driverUid, "Test B: register works");
  } catch (err) {
    assert(false, `Test B: register failed: ${err.message}`);
  }

  // Test C: login works and stores token in TokenManager
  try {
    const logP = await passengerClient.auth.login({email: passengerEmail, password});
    const logD = await driverClient.auth.login({email: driverEmail, password});
    await strangerClient.auth.login({email: strangerEmail, password});

    // Verify token was stored in tokenManager and is a valid string
    const tokenP = await passengerClient.tokenManager.getToken();
    assert(logP.success === true && logD.success === true && typeof tokenP === "string" && tokenP.length > 20, "Test C: login works and populates token");
  } catch (err) {
    assert(false, `Test C: login failed: ${err.message}`);
  }

  // Test D: authenticated API request sends Bearer token
  try {
    // Setup driver profile using driverClient
    const driverRes = await driverClient.drivers.createDriver({
      name: "Client Driver",
      phone: `+9190${phoneSuffix2}`,
      vehicleNumber: "KA02CD5555",
      vehicleModel: "Tata Nexon",
    });
    assert(driverRes.success === true && driverRes.driverId === driverUid, "Test D: authenticated API request sends Bearer token (createDriver)");
  } catch (err) {
    assert(false, `Test D failed: ${err.message}`);
  }

  // Test E: createRide works
  let testRideId = null;
  try {
    const rideRes = await passengerClient.rides.createRide({
      pickup: "HSR Layout",
      destination: "Indiranagar",
    });
    testRideId = rideRes.rideId;
    assert(rideRes.success === true && typeof testRideId === "string", "Test E: createRide works");
  } catch (err) {
    assert(false, `Test E: createRide failed: ${err.message}`);
  }

  // Test F: getRide works for authorized passenger
  try {
    const getRideRes = await passengerClient.rides.getRide(testRideId);
    assert(getRideRes.success === true && getRideRes.ride.rideId === testRideId && getRideRes.ride.passengerId === passengerUid, "Test F: getRide works for authorized passenger");
  } catch (err) {
    assert(false, `Test F: getRide failed: ${err.message}`);
  }

  // Test G: getRide rejects unauthorized user (stranger receives 403)
  try {
    await strangerClient.rides.getRide(testRideId);
    assert(false, "Test G: getRide should have rejected stranger");
  } catch (err) {
    assert(err instanceof ApiClientError && err.status === 403, "Test G: getRide rejects unauthorized user with 403");
  }

  // Test H: updateRideStatus works for authorized driver
  try {
    // Driver accepts the ride
    const acceptRes = await driverClient.rides.updateRideStatus({
      rideId: testRideId,
      status: "ACCEPTED",
    });
    // Driver can now also getRide
    const driverGetRide = await driverClient.rides.getRide(testRideId);
    assert(acceptRes.success === true && driverGetRide.ride.driverId === driverUid, "Test H: updateRideStatus works for authorized driver");
  } catch (err) {
    assert(false, `Test H: updateRideStatus failed: ${err.message}`);
  }

  // Test I: getDriverLocation works for authorized passenger
  try {
    // Driver updates location
    await driverClient.tracking.updateDriverLocation({
      rideId: testRideId,
      latitude: 12.9121,
      longitude: 77.6446,
    });
    // Passenger gets location
    const locRes = await passengerClient.tracking.getDriverLocation(testRideId);
    assert(locRes.success === true && locRes.location.latitude === 12.9121 && locRes.location.longitude === 77.6446, "Test I: getDriverLocation works for authorized passenger");
  } catch (err) {
    assert(false, `Test I: getDriverLocation failed: ${err.message}`);
  }

  // Test J: unauthorized requests return 401/403 correctly
  try {
    const unauthClient = createChauffIQClient({baseUrl: BASE_URL});
    // Calling protected endpoint without token should throw 401
    let threw401 = false;
    try {
      await unauthClient.drivers.getAvailableDrivers();
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 401) {
        threw401 = true;
      }
    }

    // Stranger attempting to update driver location should throw 403
    let threw403 = false;
    try {
      await strangerClient.tracking.updateDriverLocation({
        rideId: testRideId,
        latitude: 12.0,
        longitude: 77.0,
      });
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 403) {
        threw403 = true;
      }
    }

    assert(threw401 && threw403, "Test J: unauthorized requests return 401/403 correctly");
  } catch (err) {
    assert(false, `Test J failed: ${err.message}`);
  }

  // Test K: invalid input returns 400
  try {
    let threw400 = false;
    try {
      // Send invalid latitude
      await driverClient.tracking.updateDriverLocation({
        rideId: testRideId,
        latitude: 999.0,
        longitude: 77.0,
      });
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 400) {
        threw400 = true;
      }
    }
    assert(threw400, "Test K: invalid input returns 400");
  } catch (err) {
    assert(false, `Test K failed: ${err.message}`);
  }

  // Test L: nonexistent ride returns 404
  try {
    let threw404 = false;
    try {
      await passengerClient.rides.getRide("NON_EXISTENT_RIDE_123");
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 404) {
        threw404 = true;
      }
    }
    assert(threw404, "Test L: nonexistent ride returns 404");
  } catch (err) {
    assert(false, `Test L failed: ${err.message}`);
  }

  // Security Verification: Verify that token string representation is masked
  const tokenRepr = passengerClient.tokenManager.toString();
  const tokenMasked = !tokenRepr.includes("eyJ") && tokenRepr.includes("[TokenManager: Token Set]");
  assert(tokenMasked, "Security Check: Token string representation masks credentials");

  console.log("==========================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runClientTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
