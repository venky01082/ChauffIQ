/**
 * test_flutter_backend_integration.js
 *
 * Comprehensive Live Integration Verification for ChauffIQ
 * Flutter Frontend <-> Firebase Cloud Functions Backend (chauffiq-a0366)
 *
 * Production Backend: https://asia-southeast1-chauffiq-a0366.cloudfunctions.net
 */

'use strict';

const fs = require('fs');

async function runFullAudit() {
  const BASE_URL = 'https://asia-southeast1-chauffiq-a0366.cloudfunctions.net';
  const apiKey = 'AIzaSyCj7w7JAlJOSRlCIP_6XYLxhPCOtXhEVzM';
  const runId = Date.now().toString().slice(-6);
  const passEmail = 'audit.pass.' + runId + '@test.chauffiq';
  const drvEmail = 'audit.drv.' + runId + '@test.chauffiq';
  const password = 'AuditSecurePass@99';
  
  let passed = 0;
  let failed = 0;
  function ok(name, detail = '') {
    passed++;
    console.log('  ✓ PASS  ' + name + (detail ? ' — ' + detail : ''));
  }
  function fail(name, detail = '') {
    failed++;
    console.log('  ✗ FAIL  ' + name + (detail ? ' — ' + detail : ''));
  }

  console.log('\n================================================================');
  console.log('   CHAUFFIQ FLUTTER <-> BACKEND 25-POINT LIVE INTEGRATION AUDIT');
  console.log('================================================================');
  console.log('Production URL: ' + BASE_URL);
  console.log('Audit Timestamp: ' + new Date().toISOString() + '\n');

  // 1. Health
  try {
    let res = await fetch(BASE_URL + '/hello').catch(() => null); if (!res) res = await fetch(BASE_URL + '/hello');
    const d = await res.json();
    if (res.status === 200 && d.success) ok('T01: Health Check (/hello)', 'Region: ' + d.region);
    else fail('T01: Health Check (/hello)');
  } catch (e) { fail('T01: Health Check (/hello)', e.message); }

  // 2. Passenger Registration
  let passUid = null;
  try {
    const res = await fetch(BASE_URL + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: passEmail, password, name: 'Audit Passenger', role: 'PASSENGER' })
    });
    const d = await res.json();
    if (res.status === 201 && d.user?.uid) {
      passUid = d.user.uid;
      ok('T02: Passenger Registration (/register)', 'UID: ' + passUid.slice(0, 10) + '...');
    } else fail('T02: Passenger Registration (/register)');
  } catch (e) { fail('T02: Passenger Registration (/register)', e.message); }

  // 3. Driver Registration
  let drvUid = null;
  try {
    const res = await fetch(BASE_URL + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: drvEmail, password, name: 'Audit Chauffeur', role: 'DRIVER' })
    });
    const d = await res.json();
    if (res.status === 201 && d.user?.uid) {
      drvUid = d.user.uid;
      ok('T03: Driver User Registration (/register)', 'UID: ' + drvUid.slice(0, 10) + '...');
    } else fail('T03: Driver User Registration (/register)');
  } catch (e) { fail('T03: Driver User Registration (/register)', e.message); }

  // 4. Passenger Token
  let passToken = null;
  try {
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: passEmail, password, returnSecureToken: true })
    });
    const d = await res.json();
    if (res.status === 200 && d.idToken) {
      passToken = d.idToken;
      ok('T04: Passenger JWT Authentication (/login)', 'Verified');
    } else fail('T04: Passenger JWT Authentication (/login)');
  } catch (e) { fail('T04: Passenger JWT Authentication (/login)', e.message); }

  // 5. Driver Token
  let drvToken = null;
  try {
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: drvEmail, password, returnSecureToken: true })
    });
    const d = await res.json();
    if (res.status === 200 && d.idToken) {
      drvToken = d.idToken;
      ok('T05: Driver JWT Authentication (/login)', 'Verified');
    } else fail('T05: Driver JWT Authentication (/login)');
  } catch (e) { fail('T05: Driver JWT Authentication (/login)', e.message); }

  const passHeaders = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + passToken };
  const drvHeaders = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + drvToken };

  // 6. Sync User Profile
  try {
    const res = await fetch(BASE_URL + '/syncUser', {
      method: 'POST',
      headers: passHeaders,
      body: JSON.stringify({ name: 'Audit Passenger Synced', phone: '+9198' + runId + '01', role: 'PASSENGER' })
    });
    const d = await res.json();
    if (res.status === 200 && d.success) ok('T06: Profile Sync (/syncUser)', 'Role: ' + d.user?.role);
    else fail('T06: Profile Sync (/syncUser)');
  } catch (e) { fail('T06: Profile Sync (/syncUser)', e.message); }

  // 7. Driver Vehicle Profile Creation
  try {
    const res = await fetch(BASE_URL + '/createDriver', {
      method: 'POST',
      headers: drvHeaders,
      body: JSON.stringify({
        name: 'Audit Chauffeur',
        phone: '+9198' + runId + '02',
        vehicleType: 'Sedan',
        vehicleModel: 'Mercedes-Benz E-Class',
        vehicleNumber: 'TS09AU' + runId.slice(-4),
        licenseNumber: 'DL-' + runId
      })
    });
    const d = await res.json();
    if (res.status === 201 && d.success) ok('T07: Driver Profile Creation (/createDriver)', 'License DL-' + runId);
    else fail('T07: Driver Profile Creation (/createDriver)');
  } catch (e) { fail('T07: Driver Profile Creation (/createDriver)', e.message); }

  // 8. Driver Availability Toggle
  try {
    const res = await fetch(BASE_URL + '/updateDriverAvailability', {
      method: 'POST',
      headers: drvHeaders,
      body: JSON.stringify({ isAvailable: true })
    });
    if (res.status === 200) ok('T08: Driver Availability Toggle (/updateDriverAvailability)', 'Online');
    else fail('T08: Driver Availability Toggle (/updateDriverAvailability)');
  } catch (e) { fail('T08: Driver Availability Toggle (/updateDriverAvailability)', e.message); }

  // 9. Query Available Drivers
  try {
    const res = await fetch(BASE_URL + '/getAvailableDrivers', { headers: passHeaders });
    const d = await res.json();
    if (res.status === 200) ok('T09: Query Available Drivers (/getAvailableDrivers)', 'Online fleet retrieved');
    else fail('T09: Query Available Drivers (/getAvailableDrivers)');
  } catch (e) { fail('T09: Query Available Drivers (/getAvailableDrivers)', e.message); }

  // 10. Passenger Creates Ride
  let rideId = null;
  try {
    const res = await fetch(BASE_URL + '/createRide', {
      method: 'POST',
      headers: passHeaders,
      body: JSON.stringify({
        pickup: 'Hitech City Metro Station',
        destination: 'Inorbit Mall, Madhapur',
        drop: 'Inorbit Mall, Madhapur',
        vehicleType: 'Sedan',
        fare: 450
      })
    });
    const d = await res.json();
    if (res.status === 201 && d.rideId) {
      rideId = d.rideId;
      ok('T10: Passenger Ride Booking (/createRide)', 'Ride: ' + rideId);
    } else fail('T10: Passenger Ride Booking (/createRide)');
  } catch (e) { fail('T10: Passenger Ride Booking (/createRide)', e.message); }

  // 11. Read Ride
  try {
    const res = await fetch(BASE_URL + '/getRide?rideId=' + rideId, { headers: passHeaders });
    const d = await res.json();
    if (res.status === 200 && d.ride?.status === 'REQUESTED') ok('T11: Query Ride State (/getRide)', 'REQUESTED');
    else fail('T11: Query Ride State (/getRide)');
  } catch (e) { fail('T11: Query Ride State (/getRide)', e.message); }

  // 12. Family Monitoring Link
  try {
    const res = await fetch(BASE_URL + '/createFamilyMonitoring', {
      method: 'POST',
      headers: passHeaders,
      body: JSON.stringify({
        rideId: rideId,
        familyMemberId: 'guardian_contact_' + runId,
        relationship: 'guardian'
      })
    });
    if (res.status === 201 || res.status === 200) ok('T12: Family Safety Shield Link (/createFamilyMonitoring)', 'Linked');
    else fail('T12: Family Safety Shield Link (/createFamilyMonitoring)');
  } catch (e) { fail('T12: Family Safety Shield Link (/createFamilyMonitoring)', e.message); }

  // 13. Driver Accepts Ride (assigns driver to ride)
  try {
    const res = await fetch(BASE_URL + '/updateRideStatus', {
      method: 'POST',
      headers: drvHeaders,
      body: JSON.stringify({ rideId, status: 'ACCEPTED' })
    });
    if (res.status === 200) ok('T13: Driver Accepts Ride (/updateRideStatus -> ACCEPTED)', 'Driver assigned');
    else fail('T13: Driver Accepts Ride (/updateRideStatus -> ACCEPTED)');
  } catch (e) { fail('T13: Driver Accepts Ride (/updateRideStatus -> ACCEPTED)'); }

  // 14. Driver Broadcasts Location (driver is now assigned)
  try {
    const res = await fetch(BASE_URL + '/updateDriverLocation', {
      method: 'POST',
      headers: drvHeaders,
      body: JSON.stringify({
        rideId: rideId,
        latitude: 17.4474,
        longitude: 78.3762,
        heading: 45,
        speed: 35
      })
    });
    if (res.status === 200) ok('T14: Driver GPS Coordinates Broadcast (/updateDriverLocation)', '17.4474, 78.3762');
    else fail('T14: Driver GPS Coordinates Broadcast (/updateDriverLocation)');
  } catch (e) { fail('T14: Driver GPS Coordinates Broadcast (/updateDriverLocation)'); }

  // 15. Passenger/Guardian Reads Driver Location
  try {
    const res = await fetch(BASE_URL + '/getDriverLocation?rideId=' + rideId, { headers: passHeaders });
    const d = await res.json();
    const lat = d.latitude || d.location?.latitude;
    if (res.status === 200 && lat !== undefined) ok('T15: Live GPS Telemetry Retrieval (/getDriverLocation)', 'Lat: ' + lat);
    else fail('T15: Live GPS Telemetry Retrieval (/getDriverLocation)');
  } catch (e) { fail('T15: Live GPS Telemetry Retrieval (/getDriverLocation)', e.message); }

  // 16. Advance Ride to COMPLETED
  try {
    await fetch(BASE_URL + '/updateRideStatus', { method: 'POST', headers: drvHeaders, body: JSON.stringify({ rideId, status: 'ARRIVING' }) });
    await fetch(BASE_URL + '/updateRideStatus', { method: 'POST', headers: drvHeaders, body: JSON.stringify({ rideId, status: 'STARTED' }) });
    const comp = await fetch(BASE_URL + '/updateRideStatus', { method: 'POST', headers: drvHeaders, body: JSON.stringify({ rideId, status: 'COMPLETED' }) });
    if (comp.status === 200) ok('T16: Trip Completion Lifecycle (/updateRideStatus -> COMPLETED)', 'COMPLETED');
    else fail('T16: Trip Completion Lifecycle (/updateRideStatus -> COMPLETED)');
  } catch (e) { fail('T16: Trip Completion Lifecycle (/updateRideStatus -> COMPLETED)', e.message); }

  // 17. In-App Notification
  try {
    const res = await fetch(BASE_URL + '/createNotification', {
      method: 'POST',
      headers: passHeaders,
      body: JSON.stringify({
        recipientUid: passUid,
        title: 'Trip Ended',
        message: 'Your chauffeur trip to Inorbit Mall completed successfully.',
        type: 'RIDE_UPDATE'
      })
    });
    if (res.status === 201 || res.status === 200) ok('T17: In-App Notification Dispatch (/createNotification)', 'Created');
    else fail('T17: In-App Notification Dispatch (/createNotification)');
  } catch (e) { fail('T17: In-App Notification Dispatch (/createNotification)', e.message); }

  // 18. FCM Token Registration
  try {
    const res = await fetch(BASE_URL + '/registerFcmToken', {
      method: 'POST',
      headers: passHeaders,
      body: JSON.stringify({
        token: 'fcm_token_flutter_' + runId,
        deviceInfo: { platform: 'android', app: 'ChauffIQ' }
      })
    });
    if (res.status === 200) ok('T18: FCM Push Token Registration (/registerFcmToken)', 'Registered');
    else fail('T18: FCM Push Token Registration (/registerFcmToken)');
  } catch (e) { fail('T18: FCM Push Token Registration (/registerFcmToken)', e.message); }

  // 19. Trip History Retrieval (with rides array check)
  try {
    const res = await fetch(BASE_URL + '/getTripHistory', { headers: passHeaders });
    const d = await res.json();
    const list = Array.isArray(d) ? d : (d.rides || d.history || d.trips || []);
    if (res.status === 200 && Array.isArray(list) && list.length > 0) {
      ok('T19: Passenger Trip History Retrieval (/getTripHistory)', list.length + ' completed ride(s) retrieved');
    } else fail('T19: Passenger Trip History Retrieval (/getTripHistory)');
  } catch (e) { fail('T19: Passenger Trip History Retrieval (/getTripHistory)', e.message); }

  // 20. Passenger Rates Chauffeur
  try {
    const res = await fetch(BASE_URL + '/submitRating', {
      method: 'POST',
      headers: passHeaders,
      body: JSON.stringify({
        rideId: rideId,
        rating: 5,
        feedback: 'Outstanding chauffeur experience!'
      })
    });
    const d = await res.json();
    if (res.status === 201 || res.status === 200 || d.success) ok('T20: Rating & Review Submission (/submitRating)', '5 Stars');
    else fail('T20: Rating & Review Submission (/submitRating)');
  } catch (e) { fail('T20: Rating & Review Submission (/submitRating)', e.message); }

  // 21. Query Ride Ratings
  try {
    const res = await fetch(BASE_URL + '/getRideRatings?rideId=' + rideId, { headers: passHeaders });
    const d = await res.json();
    if (res.status === 200) ok('T21: Query Ride Ratings (/getRideRatings)', 'Retrieved');
    else fail('T21: Query Ride Ratings (/getRideRatings)');
  } catch (e) { fail('T21: Query Ride Ratings (/getRideRatings)', e.message); }

  // 22. Initiate Sandbox Payment
  let paymentId = null;
  try {
    const res = await fetch(BASE_URL + '/createPayment', {
      method: 'POST',
      headers: passHeaders,
      body: JSON.stringify({ rideId, amount: 450, paymentMethod: 'UPI' })
    });
    const d = await res.json();
    if ((res.status === 200 || res.status === 201) && d.paymentId) {
      paymentId = d.paymentId;
      ok('T22: Sandbox Payment Initiation (/createPayment)', 'Payment: ' + paymentId);
    } else fail('T22: Sandbox Payment Initiation (/createPayment)');
  } catch (e) { fail('T22: Sandbox Payment Initiation (/createPayment)', e.message); }

  // 23. Query Payment Record
  try {
    const res = await fetch(BASE_URL + '/getPayment?paymentId=' + paymentId, { headers: passHeaders });
    const d = await res.json();
    if (res.status === 200 && d.payment) ok('T23: Query Payment Ledger (/getPayment)', 'Status: ' + d.payment.status);
    else fail('T23: Query Payment Ledger (/getPayment)');
  } catch (e) { fail('T23: Query Payment Ledger (/getPayment)', e.message); }

  // 24. Simulate Payment Settlement
  try {
    const res = await fetch(BASE_URL + '/simulatePaymentResult', {
      method: 'POST',
      headers: passHeaders,
      body: JSON.stringify({ paymentId, outcome: 'SUCCESS' })
    });
    if (res.status === 200) ok('T24: Sandbox Payment Settlement (/simulatePaymentResult)', 'SUCCEEDED');
    else fail('T24: Sandbox Payment Settlement (/simulatePaymentResult)');
  } catch (e) { fail('T24: Sandbox Payment Settlement (/simulatePaymentResult)', e.message); }

  // 25. Flutter Codebase & ApiService Contract Verification
  const apiCode = fs.readFileSync('lib/services/api_service.dart', 'utf8');
  const hasLocalhost = apiCode.includes('localhost') || apiCode.includes('127.0.0.1') || apiCode.includes('5001');
  const hasAdmin = apiCode.includes('getAdminOverview') && apiCode.includes('registerFcmToken');
  if (!hasLocalhost && hasAdmin) {
    ok('T25: Zero Localhost & Complete Admin/FCM Client Coverage', 'Production Cloud Functions Verified');
  } else fail('T25: Zero Localhost & Complete Admin/FCM Client Coverage');

  console.log('\n================================================================');
  console.log('Total Checks: ' + (passed + failed));
  console.log('Passed:       ' + passed);
  console.log('Failed:       ' + failed);
  console.log('Final Verdict: ' + (failed === 0 ? 'FLUTTER + MY BACKEND READY ✅' : 'FLUTTER + MY BACKEND BLOCKED ❌'));
  console.log('================================================================\n');

  process.exit(failed === 0 ? 0 : 1);
}
runFullAudit();
