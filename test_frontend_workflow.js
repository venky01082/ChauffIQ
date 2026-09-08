/**
 * Frontend End-to-End Workflow & Integration Test Suite
 * Validates the frontend authentication flow, passenger booking, driver lifecycle,
 * and family monitoring against the local emulator.
 */

const { createChauffIQClient, ApiClientError } = require('./client');

const BASE_URL = 'http://127.0.0.1:5001/chauffiq-a0366/asia-southeast1';

async function runFrontendTests() {
  console.log('==========================================================');
  console.log('CHAUFFIQ FRONTEND WORKFLOW & SECURITY TEST SUITE');
  console.log('==========================================================');

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

  const ts = Date.now();
  const passengerEmail = `fe_passenger_${ts}@test.com`;
  const driverEmail = `fe_driver_${ts}@test.com`;
  const familyEmail = `fe_family_${ts}@test.com`;
  const strangerEmail = `fe_stranger_${ts}@test.com`;
  const password = 'password123';
  const phone1 = `+9198${String(ts).slice(-8)}`;
  const phone2 = `+9198${String(ts + 1).slice(-8)}`;
  const phone3 = `+9198${String(ts + 2).slice(-8)}`;

  // Frontend Client Instances (simulating user browser sessions)
  const passengerSession = createChauffIQClient({ baseUrl: BASE_URL });
  const driverSession = createChauffIQClient({ baseUrl: BASE_URL });
  const familySession = createChauffIQClient({ baseUrl: BASE_URL });
  const strangerSession = createChauffIQClient({ baseUrl: BASE_URL });

  // A. Register
  let pUid = null;
  let dUid = null;
  let fUid = null;
  try {
    const regP = await passengerSession.auth.register({
      email: passengerEmail,
      password,
      name: 'Frontend Passenger',
      phone: phone1,
      role: 'PASSENGER',
    });
    pUid = regP.user.uid;

    const regD = await driverSession.auth.register({
      email: driverEmail,
      password,
      name: 'Frontend Driver',
      phone: phone2,
      role: 'DRIVER',
    });
    dUid = regD.user.uid;

    const regF = await familySession.auth.register({
      email: familyEmail,
      password,
      name: 'Frontend Family',
      phone: phone3,
      role: 'PASSENGER',
    });
    fUid = regF.user.uid;

    await strangerSession.auth.register({
      email: strangerEmail,
      password,
      name: 'Frontend Stranger',
      role: 'PASSENGER',
    });

    assert(pUid && dUid && fUid, 'A. Register: All test accounts registered cleanly');
  } catch (err) {
    assert(false, `A. Register failed: ${err.message}`);
  }

  // B. Login
  try {
    const logP = await passengerSession.auth.login({ email: passengerEmail, password });
    const logD = await driverSession.auth.login({ email: driverEmail, password });
    const logF = await familySession.auth.login({ email: familyEmail, password });
    const logS = await strangerSession.auth.login({ email: strangerEmail, password });

    const pToken = await passengerSession.tokenManager.getToken();
    assert(
      logP.success && logD.success && logF.success && logS.success && typeof pToken === 'string',
      'B. Login: User sessions authenticated and tokens stored in memory'
    );
  } catch (err) {
    assert(false, `B. Login failed: ${err.message}`);
  }

  // C. Logout
  try {
    const tempSession = createChauffIQClient({ baseUrl: BASE_URL });
    await tempSession.auth.login({ email: passengerEmail, password });
    const tokenBefore = await tempSession.tokenManager.getToken();
    tempSession.auth.logout();
    const tokenAfter = await tempSession.tokenManager.getToken();
    assert(tokenBefore && tokenAfter === null, 'C. Logout: Session and tokens cleared completely');
  } catch (err) {
    assert(false, `C. Logout failed: ${err.message}`);
  }

  // D. Protected route blocks unauthenticated user
  try {
    const freshUnauth = createChauffIQClient({ baseUrl: BASE_URL });
    let blocked = false;
    try {
      await freshUnauth.rides.createRide({ pickup: 'A', destination: 'B' });
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        blocked = true;
      }
    }
    assert(blocked, 'D. Protected route blocks unauthenticated user (401)');
  } catch (err) {
    assert(false, `D. Protected route check failed: ${err.message}`);
  }

  // Setup driver profile
  try {
    await driverSession.drivers.createDriver({
      name: 'Frontend Driver',
      phone: phone2,
      vehicleNumber: 'KA03MN4321',
      vehicleModel: 'Honda City',
    });
  } catch (err) {
    console.error('Driver setup note:', err.message);
  }

  // E. Passenger creates ride
  let rideId = null;
  try {
    const rideRes = await passengerSession.rides.createRide({
      pickup: 'Koramangala 5th Block',
      destination: 'Whitefield ITPL',
    });
    rideId = rideRes.rideId;
    assert(rideRes.success && typeof rideId === 'string', 'E. Passenger creates ride');
  } catch (err) {
    assert(false, `E. Passenger create ride failed: ${err.message}`);
  }

  // F. Passenger retrieves ride
  try {
    const ride = await passengerSession.rides.getRide(rideId);
    assert(ride.success && ride.ride.rideId === rideId && ride.ride.status === 'REQUESTED', 'F. Passenger retrieves ride');
  } catch (err) {
    assert(false, `F. Passenger get ride failed: ${err.message}`);
  }

  // Driver accepts the ride
  try {
    await driverSession.rides.updateRideStatus({
      rideId,
      status: 'ACCEPTED',
    });
  } catch (err) {
    console.error('Accept ride note:', err.message);
  }

  // G. Driver can access assigned ride
  try {
    const ride = await driverSession.rides.getRide(rideId);
    assert(ride.success && ride.ride.driverId === dUid && ride.ride.status === 'ACCEPTED', 'G. Driver can access assigned ride');
  } catch (err) {
    assert(false, `G. Driver get ride failed: ${err.message}`);
  }

  // H. Unauthorized user cannot access ride
  try {
    let strangerBlocked = false;
    try {
      await strangerSession.rides.getRide(rideId);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) {
        strangerBlocked = true;
      }
    }
    assert(strangerBlocked, 'H. Unauthorized user cannot access ride (403)');
  } catch (err) {
    assert(false, `H. Unauthorized check failed: ${err.message}`);
  }

  // Driver updates location
  try {
    await driverSession.tracking.updateDriverLocation({
      rideId,
      latitude: 12.9352,
      longitude: 77.6245,
    });
  } catch (err) {
    console.error('Location update note:', err.message);
  }

  // I. Driver location appears for authorized passenger
  try {
    const loc = await passengerSession.tracking.getDriverLocation(rideId);
    assert(
      loc.success && loc.location.latitude === 12.9352 && loc.location.longitude === 77.6245,
      'I. Driver location appears for authorized passenger'
    );
  } catch (err) {
    assert(false, `I. Location tracking failed: ${err.message}`);
  }

  // Passenger enables family monitoring for fUid
  try {
    await passengerSession.family.createFamilyMonitoring({
      rideId,
      familyMemberId: fUid,
    });
  } catch (err) {
    console.error('Family monitoring note:', err.message);
  }

  // J. Family member can access authorized ride
  try {
    const famRide = await familySession.rides.getRide(rideId);
    const famLoc = await familySession.tracking.getDriverLocation(rideId);
    assert(
      famRide.success && famLoc.success && famLoc.location.latitude === 12.9352,
      'J. Family member can access authorized ride and vehicle location'
    );
  } catch (err) {
    assert(false, `J. Family monitoring check failed: ${err.message}`);
  }

  // K. Invalid input displays an error (400)
  try {
    let invalidInputCaught = false;
    try {
      await driverSession.tracking.updateDriverLocation({
        rideId,
        latitude: 'invalid_lat',
        longitude: 77.0,
      });
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 400) {
        invalidInputCaught = true;
      }
    }
    assert(invalidInputCaught, 'K. Invalid input displays error (400)');
  } catch (err) {
    assert(false, `K. Invalid input check failed: ${err.message}`);
  }

  // L. 401 authentication failure is handled correctly
  try {
    const unauth = createChauffIQClient({ baseUrl: BASE_URL });
    let authFailed = false;
    try {
      await unauth.drivers.getAvailableDrivers();
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        authFailed = true;
      }
    }
    assert(authFailed, 'L. 401 authentication failure handled correctly');
  } catch (err) {
    assert(false, `L. 401 check failed: ${err.message}`);
  }

  // M. 403 authorization failure is handled correctly
  try {
    let authzFailed = false;
    try {
      await strangerSession.rides.updateRideStatus({
        rideId,
        status: 'CANCELLED',
      });
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) {
        authzFailed = true;
      }
    }
    assert(authzFailed, 'M. 403 authorization failure handled correctly');
  } catch (err) {
    assert(false, `M. 403 check failed: ${err.message}`);
  }

  // N. 404 ride-not-found is handled correctly
  try {
    let notFoundCaught = false;
    try {
      await passengerSession.rides.getRide('UNKNOWN_RIDE_ID_999');
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        notFoundCaught = true;
      }
    }
    assert(notFoundCaught, 'N. 404 ride-not-found handled correctly');
  } catch (err) {
    assert(false, `N. 404 check failed: ${err.message}`);
  }

  // O. No tokens/secrets appear in console
  const passengerRepr = passengerSession.tokenManager.toString();
  const driverRepr = driverSession.tokenManager.toString();
  const noTokensInLogs = !passengerRepr.includes('eyJ') && !driverRepr.includes('eyJ');
  assert(noTokensInLogs, 'O. No tokens/secrets appear in console or string representations');

  console.log('==========================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('==========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runFrontendTests().catch((err) => {
  console.error('Frontend test runner error:', err);
  process.exit(1);
});
