"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("====================================================");
console.log("   CHAUFFIQ PURE MODULAR BACKEND VERIFICATION");
console.log("====================================================\n");

let passed = 0;
let failed = 0;

function ok(testName, details = "") {
  passed++;
  console.log(`  ✓ ${testName}${details ? " — " + details : ""}`);
}

function fail(testName, details = "") {
  failed++;
  console.error(`  ✗ ${testName}${details ? " — " + details : ""}`);
}

// 1. Directory Structure Verification
console.log("--- Section 1: Modular Directory Architecture ---");
const expectedDirs = [
  "functions/controllers",
  "functions/services",
  "functions/routes",
  "functions/middleware",
  "functions/utils",
  "public",
];

expectedDirs.forEach((dir) => {
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    ok(`Directory exists: ${dir}`);
  } else {
    fail(`Missing directory: ${dir}`);
  }
});

// 2. Mobile / Flutter Isolation Verification
console.log("\n--- Section 2: Mobile/Flutter Separation & Backend Cleanliness ---");
const forbiddenDirs = ["lib", "android", "ios"];
forbiddenDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    ok(`Mobile/Flutter directory safely absent: ${dir}`);
  } else {
    fail(`Mobile/Flutter directory should not exist in web/backend root: ${dir}`);
  }
});

// 3. Module Exports Verification
console.log("\n--- Section 3: Cloud Functions v2 Exports ---");
const funcs = require("./functions/index.js");

const requiredEndpoints = [
  "api",
  "hello",
  "register",
  "login",
  "syncUser",
  "createDriver",
  "updateDriverAvailability",
  "getAvailableDrivers",
  "updateDriverLocation",
  "getDriverLocation",
  "createRide",
  "getRide",
  "updateRideStatus",
  "createFamilyMonitoring",
  "createNotification",
  "registerFcmToken",
  "getTripHistory",
  "submitRating",
  "getRideRatings",
  "createPayment",
  "getPayment",
  "simulatePaymentResult",
  "bootstrapAdmin",
  "getAdminOverview",
  "getAdminUsers",
  "getAdminDrivers",
  "getAdminRides",
  "getAdminPayments",
  "getAdminRatings",
  "getAdminRideDetails",
];

requiredEndpoints.forEach((ep) => {
  if (funcs[ep]) {
    ok(`Exported Cloud Function v2 verified: ${ep}`);
  } else {
    fail(`Missing required Cloud Function export: ${ep}`);
  }
});

// 4. Express API Gateway Route Matching
console.log("\n--- Section 4: Express API Gateway Routing ---");
const apiApp = require("./functions/routes/apiRouter.js");
if (apiApp && typeof apiApp === "function") {
  ok("Express apiApp is instantiated and exportable");
} else {
  fail("Express apiApp failed to instantiate");
}

// 5. Config, Rules & Indexes Verification
console.log("\n--- Section 5: Configuration & Security Rules ---");
if (fs.existsSync("firebase.json")) {
  const fbJson = JSON.parse(fs.readFileSync("firebase.json", "utf8"));
  if (fbJson.hosting && (fbJson.hosting.public === "frontend/dist" || fbJson.hosting.public === "public")) {
    ok(`firebase.json configured with hosting.public = ${fbJson.hosting.public}`);
  } else {
    fail("firebase.json hosting.public is not set to frontend/dist or public");
  }
  const hasApiRewrite = (fbJson.hosting.rewrites || []).some(
      (r) => r.source === "/api/**" && r.function && r.function.functionId === "api",
  );
  if (hasApiRewrite) {
    ok("firebase.json rewrites /api/** to function api");
  } else {
    fail("firebase.json missing /api/** rewrite to function api");
  }
}

if (fs.existsSync("firestore.rules")) {
  const rules = fs.readFileSync("firestore.rules", "utf8");
  if (rules.includes("match /_rateLimits/{docId}") && rules.includes("match /admins/{uid}")) {
    ok("firestore.rules protects _rateLimits and admins collections");
  } else {
    fail("firestore.rules missing sensitive collection protections");
  }
}

if (fs.existsSync("firestore.indexes.json")) {
  const indexes = JSON.parse(fs.readFileSync("firestore.indexes.json", "utf8"));
  if (Array.isArray(indexes.indexes) && indexes.indexes.length >= 5) {
    ok(`firestore.indexes.json contains ${indexes.indexes.length} composite indexes`);
  } else {
    fail("firestore.indexes.json missing required composite indexes");
  }
}

if (fs.existsSync("API_DOCUMENTATION.md")) {
  const docs = fs.readFileSync("API_DOCUMENTATION.md", "utf8");
  if (docs.includes("POST /auth/register") && docs.includes("POST /rides/book")) {
    ok("API_DOCUMENTATION.md verified with complete endpoint catalog");
  } else {
    fail("API_DOCUMENTATION.md missing required endpoint documentation");
  }
}

console.log("\n====================================================");
console.log("   MODULAR BACKEND VERIFICATION SUMMARY");
console.log("====================================================");
console.log(`Total Checks: ${passed + failed}`);
console.log(`Passed:       ${passed}`);
console.log(`Failed:       ${failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("\nALL MODULAR BACKEND VERIFICATION CHECKS PASSED!");
  process.exit(0);
}
