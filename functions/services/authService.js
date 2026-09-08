"use strict";

const {auth, db} = require("../utils/firebase");
const {AppError, AuthError} = require("../utils/errors");

/**
 * Registers a new user in Firebase Auth and Firestore.
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} params.name
 * @param {string} [params.phone]
 * @param {string} [params.role="PASSENGER"]
 * @return {Promise<object>}
 */
async function registerUser({email, password, name, phone, role = "PASSENGER"}) {
  const createUserData = {
    email: email,
    password: password,
    displayName: name,
  };
  if (phone) {
    createUserData.phoneNumber = phone;
  }

  const userRecord = await auth.createUser(createUserData);

  const userDocData = {
    uid: userRecord.uid,
    name: name,
    email: email,
    phone: phone || "",
    role: role || "PASSENGER",
    createdAt: new Date().toISOString(),
  };

  await db.collection("users").doc(userRecord.uid).set(userDocData);

  return {
    uid: userRecord.uid,
    name: name,
    email: email,
    role: role || "PASSENGER",
  };
}

/**
 * Authenticates user credentials via Firebase Auth REST API (Identity Toolkit).
 * Auto-detects local Auth emulator vs Google Cloud production Identity Platform.
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} [params.apiKey]
 * @return {Promise<object>}
 */
async function loginUser({email, password, apiKey = ""}) {
  const isEmulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;

  let authUrl;
  if (isEmulator) {
    const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
    authUrl =
      `http://${authHost}/identitytoolkit.googleapis.com/v1/` +
      `accounts:signInWithPassword?key=fake-api-key`;
  } else {
    let key = apiKey || process.env.WEB_API_KEY || "";
    if (
      (key.startsWith("\"") && key.endsWith("\"")) ||
      (key.startsWith("'") && key.endsWith("'"))
    ) {
      key = key.slice(1, -1).trim();
    }
    if (!key) {
      throw new AppError(500, "Server configuration error: authentication not configured");
    }
    authUrl =
      `https://identitytoolkit.googleapis.com/v1/` +
      `accounts:signInWithPassword?key=${encodeURIComponent(key)}`;
  }

  const authResponse = await fetch(authUrl, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      email: email,
      password: password,
      returnSecureToken: true,
    }),
  });

  const authData = await authResponse.json();

  if (!authResponse.ok) {
    throw new AuthError(401, "Invalid email or password");
  }

  const [userDoc, adminDoc] = await Promise.all([
    db.collection("users").doc(authData.localId).get(),
    db.collection("admins").doc(authData.localId).get(),
  ]);

  let userData = null;
  if (userDoc.exists) {
    userData = userDoc.data();
  }

  let isAdmin = false;
  if (userData && userData.role === "ADMIN") {
    isAdmin = true;
  }
  if (adminDoc.exists && adminDoc.data().active !== false) {
    isAdmin = true;
  }

  return {
    user: {
      uid: authData.localId,
      email: authData.email,
      name: (userData && userData.name) || "",
      phone: (userData && userData.phone) || "",
      role: isAdmin ? "ADMIN" : ((userData && userData.role) || ""),
      isAdmin: isAdmin,
    },
    idToken: authData.idToken,
    refreshToken: authData.refreshToken,
  };
}

/**
 * Synchronizes user profile with Firestore record.
 * @param {string} uid
 * @param {object} profileData
 * @param {object} [decodedToken]
 * @return {Promise<{user: object, isNew: boolean}>}
 */
async function syncUserProfile(uid, profileData = {}, decodedToken = {}) {
  const userRef = db.collection("users").doc(uid);
  const existing = await userRef.get();

  const tokenPhone = decodedToken.phone_number || "";
  const tokenEmail = decodedToken.email || "";

  if (!existing.exists) {
    const newUserData = {
      uid: uid,
      name: (typeof profileData.name === "string" && profileData.name.trim()) || "User",
      email: tokenEmail || profileData.email || "",
      phone: tokenPhone || profileData.phone || "",
      role: profileData.role === "DRIVER" ? "DRIVER" : "PASSENGER",
      createdAt: new Date().toISOString(),
    };
    await userRef.set(newUserData);
    return {user: newUserData, isNew: true};
  }

  const existingData = existing.data() || {};
  const updates = {};
  const phoneToSet = tokenPhone || profileData.phone;
  if (phoneToSet && existingData.phone !== phoneToSet) {
    updates.phone = phoneToSet;
  }
  if (typeof profileData.name === "string" && profileData.name.trim() && !existingData.name) {
    updates.name = profileData.name.trim();
  }
  if (profileData.role && (profileData.role === "PASSENGER" || profileData.role === "DRIVER") && !existingData.role) {
    updates.role = profileData.role;
  }
  if (profileData.photoUrl && !existingData.photoUrl) {
    updates.photoUrl = profileData.photoUrl;
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date().toISOString();
    await userRef.set(updates, {merge: true});
  }

  return {user: Object.assign({}, existingData, updates), isNew: false};
}

/**
 * Designates a user as Administrator with custom claims and server doc.
 * @param {string} uid
 * @param {string} [email]
 * @return {Promise<void>}
 */
async function bootstrapAdminUser(uid, email = "") {
  await auth.setCustomUserClaims(uid, {admin: true, role: "ADMIN"});

  await db.collection("admins").doc(uid).set({
    uid: uid,
    email: email,
    active: true,
    role: "ADMIN",
    grantedAt: new Date().toISOString(),
  }, {merge: true});

  await db.collection("users").doc(uid).set({
    role: "ADMIN",
  }, {merge: true});
}

module.exports = {
  registerUser,
  loginUser,
  syncUserProfile,
  bootstrapAdminUser,
};
