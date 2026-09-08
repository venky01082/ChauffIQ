/**
 * scripts/set_admin.js — Developer Admin Designation CLI Script
 *
 * Designates a user as an Administrator with server-authoritative custom claims
 * and Firestore /admins/{uid} collection record.
 *
 * Supports both:
 * 1. Direct Firebase Admin SDK (when local ADC is configured)
 * 2. Deployed bootstrapAdmin endpoint using developer secret key
 *
 * Usage:
 *   node scripts/set_admin.js <email-or-uid> [password]
 */

"use strict";

const BASE_URL = "https://asia-southeast1-chauffiq-a0366.cloudfunctions.net";
const BOOTSTRAP_SECRET = process.env.ADMIN_BOOTSTRAP_SECRET || "chauffiq-admin-bootstrap-secret-key-2026";

async function elevateViaApi(email, password) {
  console.log("Connecting via secure Cloud Functions bootstrap endpoint...");
  const loginResp = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: password || "AdminTestPassword123!" }),
  });
  const loginData = await loginResp.json().catch(() => ({}));

  if (!loginResp.ok || !loginData.idToken) {
    throw new Error(`Login failed for ${email}: ${loginData.message || loginResp.statusText}`);
  }

  const bootstrapResp = await fetch(`${BASE_URL}/bootstrapAdmin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${loginData.idToken}`,
      "x-admin-bootstrap-key": BOOTSTRAP_SECRET,
    },
    body: JSON.stringify({}),
  });
  const bootstrapData = await bootstrapResp.json().catch(() => ({}));

  if (!bootstrapResp.ok || !bootstrapData.success) {
    throw new Error(`Bootstrap failed: ${bootstrapData.message || bootstrapResp.statusText}`);
  }

  console.log("✓ Custom claims set: { admin: true, role: 'ADMIN' }");
  console.log(`✓ /admins/${loginData.user.uid} record updated`);
  console.log(`✓ /users/${loginData.user.uid} role updated to ADMIN`);
  console.log(`\nSUCCESS: ${email} is now an authorized Administrator.\n`);
}

async function main() {
  const target = process.argv[2];
  const password = process.argv[3];
  if (!target) {
    console.error("Usage: node scripts/set_admin.js <email-or-uid> [password]");
    process.exit(1);
  }

  try {
    const admin = require("../functions/node_modules/firebase-admin");
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "chauffiq-a0366" });
    }
    const auth = admin.auth();
    const db = admin.firestore();

    let userRecord;
    if (target.includes("@")) {
      userRecord = await auth.getUserByEmail(target);
    } else {
      userRecord = await auth.getUser(target);
    }

    const uid = userRecord.uid;
    console.log(`Found user: ${userRecord.email || uid} (${uid})`);

    await auth.setCustomUserClaims(uid, { admin: true, role: "ADMIN" });
    console.log("✓ Custom claims set: { admin: true, role: 'ADMIN' }");

    await db.collection("admins").doc(uid).set({
      uid: uid,
      email: userRecord.email || "",
      active: true,
      role: "ADMIN",
      grantedAt: new Date().toISOString(),
    }, { merge: true });
    console.log(`✓ /admins/${uid} record updated`);

    await db.collection("users").doc(uid).set({
      role: "ADMIN",
    }, { merge: true });
    console.log(`✓ /users/${uid} role updated to ADMIN`);

    console.log(`\nSUCCESS: ${userRecord.email || uid} is now an authorized Administrator.\n`);
  } catch (err) {
    if (err.message && (err.message.includes("default credentials") || err.message.includes("Could not load"))) {
      if (target.includes("@")) {
        await elevateViaApi(target, password);
      } else {
        console.error("ADC not configured. Please provide user email and password to elevate via developer bootstrap API.");
        process.exit(1);
      }
    } else {
      console.error(`Error setting admin: ${err.message}`);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error("Execution failed:", err.message);
  process.exit(1);
});
