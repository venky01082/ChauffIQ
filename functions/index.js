const crypto = require("crypto");
const {setGlobalOptions} = require("firebase-functions/v2");
const {onRequest: rawOnRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore} = require("firebase-admin/firestore");
const {getMessaging} = require("firebase-admin/messaging");

// Declare SecretParam for production Google Identity Toolkit Web API Key
const webApiKey = defineSecret("WEB_API_KEY");
// Declare SecretParam for developer-controlled Administrator Bootstrap Key
const adminBootstrapSecret = defineSecret("ADMIN_BOOTSTRAP_SECRET");

// Initialize Firebase Admin
initializeApp();

const auth = getAuth();
const db = getFirestore();
const messaging = getMessaging();

// Allowed origins for CORS protection
const ALLOWED_ORIGINS = [
  "https://chauffiq-a0366.web.app",
  "https://chauffiq-a0366.firebaseapp.com",
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

// Firebase Functions configuration
setGlobalOptions({
  region: "asia-southeast1",
  maxInstances: 10,
  cors: ALLOWED_ORIGINS,
  secrets: ["WEB_API_KEY", "ADMIN_BOOTSTRAP_SECRET"],
});

/**
 * HTTPS Function wrapper ensuring CORS middleware handles OPTIONS preflights.
 * In Firebase Functions v2, onRequest must explicitly receive cors config
 * so the CORS middleware intercepts OPTIONS preflight requests in production.
 * @param {Function} handler - Request handler
 * @return {Function} Cloud Function
 */
const onRequest = (handler) =>
  rawOnRequest({cors: ALLOWED_ORIGINS, invoker: "public"}, handler);

// ============================================================
// AUTH HELPER
// ============================================================

/**
 * Auth error carrying an HTTP status code.
 * Extends Error so ESLint no-throw-literal is satisfied.
 */
class AuthError extends Error {
  /**
   * @param {number} status - HTTP status code
   * @param {string} message - Human-readable error message
   */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Reads: Authorization: Bearer <idToken>
 * Throws AuthError on any failure.
 * @param {object} req - Express request object
 * @return {Promise<object>} Decoded Firebase token (contains .uid)
 */
async function verifyToken(req) {
  const authHeader = req.headers["authorization"] || "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new AuthError(
        401,
        "Missing or invalid Authorization header",
    );
  }
  const idToken = authHeader.slice(7);
  if (!idToken) {
    throw new AuthError(401, "Token is empty");
  }
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (err) {
    throw new AuthError(401, "Invalid or expired token");
  }
}

/**
 * Verifies that the request carries a valid ID token belonging to an
 * authorized admin.
 * Checks server-authoritative custom claims and Firestore /admins/{uid}
 * collection.
 * Rejects unauthenticated callers with 401.
 * Rejects authenticated non-admin callers with 403.
 * @param {object} req - Express request object
 * @return {Promise<object>} Decoded token of verified admin
 */
async function verifyAdmin(req) {
  const decodedToken = await verifyToken(req);
  const uid = decodedToken.uid;

  // 1. Check custom claims
  if (decodedToken.admin === true || decodedToken.role === "ADMIN") {
    return decodedToken;
  }

  // 2. Check server-authoritative Firestore /admins/{uid} collection
  const adminDoc = await db.collection("admins").doc(uid).get();
  if (adminDoc.exists && adminDoc.data().active !== false) {
    return decodedToken;
  }

  // Caller is authenticated but not an admin
  throw new AuthError(403, "Access denied: Administrator privileges required");
}

/**
 * Structured audit logging for administrative actions.
 * Never logs secrets, passwords, or tokens.
 * @param {string} adminUid
 * @param {string} action
 * @param {string} [resourceId]
 * @param {object} [details]
 */
function logAdminAction(adminUid, action, resourceId = "", details = {}) {
  const safeLog = {
    event: "ADMIN_ACTION",
    adminUid: adminUid,
    action: action,
    resourceId: resourceId,
    timestamp: new Date().toISOString(),
    ...details,
  };
  console.log(JSON.stringify(safeLog));
}


/**
 * Sanitized logging helper for operational tracing.
 * Emits structured GCP Cloud Logging & Error Reporting events.
 * Never logs secrets, passwords, or credentials.
 */
const log = {
  error: (tag, msg, err) => {
    const errText = err ? (err.message || String(err)) : "";
    const payload = {
      "severity": "ERROR",
      "message": `[${tag}] ${msg} ${errText}`.trim(),
      "tag": tag,
      "timestamp": new Date().toISOString(),
      "@type":
        "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1" +
        ".ReportedErrorEvent",
      "serviceContext": {
        service: "chauffiq-backend",
        version: "phase15",
      },
    };
    if (err && err.stack) {
      payload.stack_trace = err.stack;
    }
    console.error(JSON.stringify(payload));
  },
  warn: (tag, msg) => {
    console.warn(JSON.stringify({
      severity: "WARNING",
      tag: tag,
      message: msg,
      timestamp: new Date().toISOString(),
    }));
  },
  info: (tag, msg) => {
    console.log(JSON.stringify({
      severity: "INFO",
      tag: tag,
      message: msg,
      timestamp: new Date().toISOString(),
    }));
  },
};

/**
 * Returns a sanitized HTTP 500 JSON response without leaking internal errors.
 * @param {object} res - Express response object
 * @param {string} userMessage - Safe human-readable message
 * @param {string} tag - Contextual function tag for logging
 * @param {Error} error - Internal error for logging
 * @return {object}
 */
function safeInternalError(res, userMessage, tag, error) {
  log.error(tag, userMessage, error);
  return res.status(500).json({
    success: false,
    message: userMessage,
  });
}

/**
 * Distributed rate limiter backed by Firestore collection _rateLimits.
 * Uses SHA-256 hashed IP to ensure zero PII is persisted in database.
 * @param {object} req - Express request object
 * @param {string} action - 'register' | 'login'
 * @param {number} maxRequests - Max requests allowed in time window
 * @param {number} windowMs - Window duration in ms
 * @return {Promise<{allowed: boolean, remaining: number,
 *   retryAfterSec: number}>}
 */
async function checkRateLimit(
    req,
    action,
    maxRequests = 25,
    windowMs = 15 * 60 * 1000,
) {
  if (process.env.RATE_LIMIT_DISABLED === "true" ||
      process.env.FUNCTIONS_EMULATOR === "true") {
    return {allowed: true, remaining: maxRequests, retryAfterSec: 0};
  }

  // Allow developer test runners with valid ADMIN_BOOTSTRAP_SECRET
  const devKey = req.headers["x-admin-bootstrap-key"] ||
      req.headers["x-test-bypass-key"];
  if (typeof devKey === "string" && devKey.length > 0) {
    let activeSecret = null;
    try {
      if (typeof adminBootstrapSecret.value === "function") {
        activeSecret = adminBootstrapSecret.value();
      }
    } catch (_) {
      // Ignore if secret manager is uninitialized
    }
    if (!activeSecret) {
      activeSecret = process.env.ADMIN_BOOTSTRAP_SECRET || null;
    }
    if (activeSecret) {
      const bufDev = Buffer.from(devKey, "utf8");
      const bufActive = Buffer.from(activeSecret, "utf8");
      if (bufDev.length === bufActive.length &&
          crypto.timingSafeEqual(bufDev, bufActive)) {
        return {allowed: true, remaining: maxRequests, retryAfterSec: 0};
      }
    }
  }

  const forwarded = req.headers["x-forwarded-for"];
  const remoteIp = req.socket ? req.socket.remoteAddress : null;
  const rawIp = (typeof forwarded === "string" ?
    forwarded.split(",")[0] : (req.ip || remoteIp)) || "unknown";
  const ipHash = crypto
      .createHash("sha256")
      .update(String(rawIp).trim())
      .digest("hex")
      .slice(0, 32);
  const docId = `${action}_${ipHash}`;
  const docRef = db.collection("_rateLimits").doc(docId);

  const now = Date.now();
  try {
    const result = await db.runTransaction(async (t) => {
      const doc = await t.get(docRef);
      if (!doc.exists) {
        t.set(docRef, {
          action: action,
          count: 1,
          windowStart: now,
          expiresAt: new Date(now + windowMs).toISOString(),
        });
        return {allowed: true, remaining: maxRequests - 1, retryAfterSec: 0};
      }

      const data = doc.data() || {};
      const windowStart = typeof data.windowStart === "number" ?
        data.windowStart : (now - windowMs - 1000);
      if (now - windowStart > windowMs) {
        t.set(docRef, {
          action: action,
          count: 1,
          windowStart: now,
          expiresAt: new Date(now + windowMs).toISOString(),
        });
        return {allowed: true, remaining: maxRequests - 1, retryAfterSec: 0};
      }

      if ((data.count || 0) >= maxRequests) {
        const retryAfterSec = Math.max(
            1,
            Math.ceil((windowStart + windowMs - now) / 1000),
        );
        return {allowed: false, remaining: 0, retryAfterSec: retryAfterSec};
      }

      t.update(docRef, {
        count: (data.count || 0) + 1,
      });
      return {
        allowed: true,
        remaining: maxRequests - ((data.count || 0) + 1),
        retryAfterSec: 0,
      };
    });

    return result;
  } catch (err) {
    log.warn("checkRateLimit", `Rate limit fallback: ${err.message}`);
    return {allowed: true, remaining: 1, retryAfterSec: 0};
  }
}

/**
 * Sends an FCM push notification to a user's registered devices.
 * Automatically cleans up invalid or unregistered tokens.
 * @param {string} userId - Target user UID
 * @param {object} payload - Notification payload
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body
 * @param {object} [payload.data] - Additional string key-value pairs
 * @return {Promise<{sent: number, failed: number}>}
 */
async function sendPushNotificationToUser(userId, {title, body, data = {}}) {
  if (!userId || !title || !body) {
    return {sent: 0, failed: 0};
  }

  try {
    const tokensSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("fcmTokens")
        .get();

    if (tokensSnapshot.empty) {
      return {sent: 0, failed: 0};
    }

    const tokenDocs = tokensSnapshot.docs;
    const tokens = tokenDocs
        .map((d) => d.data().token)
        .filter(Boolean);

    if (tokens.length === 0) {
      return {sent: 0, failed: 0};
    }

    const stringData = {};
    for (const [k, v] of Object.entries(data)) {
      stringData[k] = String(v);
    }

    const message = {
      tokens: tokens,
      notification: {
        title: title,
        body: body,
      },
      data: stringData,
    };

    const response = await messaging.sendEachForMulticast(message);
    const sentCount = response.successCount;
    const failedCount = response.failureCount;

    if (response.failureCount > 0) {
      const batch = db.batch();
      let deleteCount = 0;

      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const errCode = resp.error.code;
          if (
            errCode === "messaging/invalid-registration-token" ||
            errCode === "messaging/registration-token-not-registered"
          ) {
            batch.delete(tokenDocs[idx].ref);
            deleteCount++;
          }
        }
      });

      if (deleteCount > 0) {
        await batch.commit();
      }
    }

    return {sent: sentCount, failed: failedCount};
  } catch (error) {
    console.error("sendPushNotificationToUser error:", error.message);
    return {sent: 0, failed: 0};
  }
}

// ============================================================
// RIDE STATUS — forward-only transition map
// ============================================================

const VALID_TRANSITIONS = {
  "REQUESTED": ["ACCEPTED", "CANCELLED"],
  "ACCEPTED": ["ARRIVING", "CANCELLED"],
  "ARRIVING": ["STARTED", "CANCELLED"],
  "STARTED": ["COMPLETED"],
  "COMPLETED": [],
  "CANCELLED": [],
};

// ============================================================
// 1. TEST BACKEND (public)
// ============================================================

exports.hello = onRequest((req, res) => {
  res.json({
    success: true,
    message: "ChauffIQ Backend is working!",
  });
});

// ============================================================
// 2. REGISTER USER (public — no token required)
// ============================================================

exports.register = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Only POST requests are allowed",
      });
    }

    const rateLimit = await checkRateLimit(
        req, "register", 25, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      res.set("Retry-After", String(rateLimit.retryAfterSec));
      return res.status(429).json({
        success: false,
        message:
          "Too many registration attempts. Please try again in " +
          `${rateLimit.retryAfterSec} seconds.`,
      });
    }

    const body = req.body || {};

    const {
      email,
      password,
      name,
      phone,
      role,
    } = body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || !EMAIL_REGEX.test(email) ||
        email.length > 254) {
      return res.status(400).json({
        success: false,
        message: "Valid email address is required (max 254 characters)",
      });
    }

    if (typeof password !== "string" || password.length < 6 ||
        password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must contain between 6 and 128 characters",
      });
    }

    if (typeof name !== "string" || name.trim().length === 0 ||
        name.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must be a valid string up to 100 characters",
      });
    }

    // Optional phone validation: must be E.164 format if provided
    const rawPhone = typeof phone === "string" ? phone.trim() : "";
    let validPhoneNumber;

    if (rawPhone.length > 0) {
      const E164_REGEX = /^\+[1-9]\d{1,14}$/;
      if (!E164_REGEX.test(rawPhone)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid phone number. Must be E.164 format (e.g. +919876543210)",
        });
      }
      validPhoneNumber = rawPhone;
    }

    const createUserData = {
      email: email,
      password: password,
      displayName: name,
    };
    if (validPhoneNumber) {
      createUserData.phoneNumber = validPhoneNumber;
    }

    const userRecord = await auth.createUser(createUserData);

    await db
        .collection("users")
        .doc(userRecord.uid)
        .set({
          uid: userRecord.uid,
          name: name,
          email: email,
          phone: validPhoneNumber || "",
          role: role || "PASSENGER",
          createdAt: new Date().toISOString(),
        });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        uid: userRecord.uid,
        name: name,
        email: email,
        role: role || "PASSENGER",
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    const errCode =
      error.code || (error.errorInfo && error.errorInfo.code);

    if (errCode === "auth/email-already-exists") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    if (errCode === "auth/invalid-phone-number") {
      return res.status(400).json({
        success: false,
        message:
          "Invalid phone number. Must be in E.164 format (e.g. +919876543210)",
      });
    }

    return safeInternalError(res, "Registration failed", "register", error);
  }
});

// ============================================================
// 3. CREATE DRIVER PROFILE (authenticated)
// UID comes from the verified token — NOT from the request body.
// ============================================================

exports.createDriver = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Only POST requests are allowed",
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(req);
    } catch (authErr) {
      return res.status(authErr.status).json({
        success: false,
        message: authErr.message,
      });
    }

    // Identity comes from the verified token — body uid is ignored
    const uid = decodedToken.uid;

    const body = req.body || {};
    const {
      name,
      phone,
      vehicleNumber,
      vehicleModel,
      rating,
    } = body;

    if (!name || !phone || !vehicleNumber) {
      return res.status(400).json({
        success: false,
        message: "name, phone and vehicleNumber are required",
      });
    }

    await db
        .collection("drivers")
        .doc(uid)
        .set({
          uid: uid,
          name: name,
          phone: phone,
          vehicleNumber: vehicleNumber,
          vehicleModel: vehicleModel || "",
          rating: Number(rating) || 5,
          isAvailable: true,
          isOnline: true,
          totalTrips: 0,
          createdAt: new Date().toISOString(),
        });

    await db
        .collection("users")
        .doc(uid)
        .set(
            {role: "DRIVER"},
            {merge: true},
        );

    return res.status(201).json({
      success: true,
      message: "Driver profile created successfully",
      driverId: uid,
    });
  } catch (error) {
    console.error("Driver creation error:", error);

    return safeInternalError(
        res, "Failed to create driver", "createDriver", error);
  }
});

// ============================================================
// 4. CREATE RIDE (authenticated)
// passengerId comes from the verified token — NOT from the body.
// ============================================================

exports.createRide = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Only POST requests are allowed",
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(req);
    } catch (authErr) {
      return res.status(authErr.status).json({
        success: false,
        message: authErr.message,
      });
    }

    // Passenger identity comes from the verified token
    const passengerId = decodedToken.uid;

    const body = req.body || {};
    const {pickup, destination} = body;

    if (!pickup || !destination ||
        typeof pickup !== "string" ||
        typeof destination !== "string" ||
        pickup.trim().length === 0 ||
        destination.trim().length === 0 ||
        pickup.length > 255 ||
        destination.length > 255) {
      return res.status(400).json({
        success: false,
        message: "pickup and destination must be non-empty strings (max 255)",
      });
    }

    const rideRef = db.collection("rides").doc();

    const nowIso = new Date().toISOString();
    await rideRef.set({
      rideId: rideRef.id,
      passengerId: passengerId,
      driverId: null,
      pickup: pickup,
      destination: destination,
      status: "REQUESTED",
      createdAt: nowIso,
      requestedAt: nowIso,
      acceptedAt: null,
      arrivingAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
    });

    return res.status(201).json({
      success: true,
      message: "Ride created successfully",
      rideId: rideRef.id,
    });
  } catch (error) {
    console.error("Ride creation error:", error);

    return safeInternalError(res, "Failed to create ride", "createRide", error);
  }
});

// ============================================================
// 5. UPDATE DRIVER LOCATION (authenticated — assigned driver only)
// driverId comes from the verified token — NOT from the body.
// ============================================================

exports.updateDriverLocation = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Only POST requests are allowed",
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(req);
    } catch (authErr) {
      return res.status(authErr.status).json({
        success: false,
        message: authErr.message,
      });
    }

    // Driver identity comes from the verified token
    const driverId = decodedToken.uid;

    const body = req.body || {};
    const {rideId, latitude, longitude} = body;

    if (!rideId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "rideId, latitude and longitude are required",
      });
    }

    // Validate coordinates — reject NaN and out-of-range values
    const lat = Number(latitude);
    const lon = Number(longitude);

    if (!isFinite(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message:
          "latitude must be a finite number between -90 and 90",
      });
    }

    if (!isFinite(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        message:
          "longitude must be a finite number between -180 and 180",
      });
    }

    // Verify the caller is the assigned driver on this ride
    const rideDoc = await db.collection("rides").doc(rideId).get();
    if (!rideDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    if (rideDoc.data().driverId !== driverId) {
      return res.status(403).json({
        success: false,
        message: "You are not the assigned driver for this ride",
      });
    }

    await db
        .collection("tracking")
        .doc(rideId)
        .set(
            {
              rideId: rideId,
              driverId: driverId,
              latitude: lat,
              longitude: lon,
              updatedAt: new Date().toISOString(),
            },
            {merge: true},
        );

    return res.status(200).json({
      success: true,
      message: "Driver location updated",
    });
  } catch (error) {
    console.error("Location update error:", error);

    return safeInternalError(
        res, "Failed to update location", "updateDriverLocation", error);
  }
});

// ============================================================
// 6. GET DRIVER LOCATION (authenticated)
// Accessible by: the passenger, the assigned driver, or a
// registered active family member for this ride.
// ============================================================

exports.getDriverLocation = onRequest(async (req, res) => {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        success: false,
        message: "Only GET requests are allowed",
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(req);
    } catch (authErr) {
      return res.status(authErr.status).json({
        success: false,
        message: authErr.message,
      });
    }

    const callerUid = decodedToken.uid;
    const rideId = req.query.rideId;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "rideId is required",
      });
    }

    // Fetch the ride to establish ownership
    const rideDoc = await db.collection("rides").doc(rideId).get();
    if (!rideDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    const ride = rideDoc.data();
    const isPassenger = ride.passengerId === callerUid;
    const isAssignedDriver = ride.driverId === callerUid;

    // Check family monitoring access if caller is neither passenger nor driver
    let isFamilyMember = false;
    if (!isPassenger && !isAssignedDriver) {
      const familySnap = await db
          .collection("familyMonitoring")
          .where("rideId", "==", rideId)
          .where("familyMemberId", "==", callerUid)
          .where("active", "==", true)
          .limit(1)
          .get();
      isFamilyMember = !familySnap.empty;
    }

    if (!isPassenger && !isAssignedDriver && !isFamilyMember) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this ride's location",
      });
    }

    const locationDoc = await db
        .collection("tracking")
        .doc(rideId)
        .get();

    if (!locationDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Driver location not found",
      });
    }

    return res.status(200).json({
      success: true,
      location: locationDoc.data(),
    });
  } catch (error) {
    console.error("Get location error:", error);

    return safeInternalError(
        res, "Failed to get driver location", "getDriverLocation", error);
  }
});

// ============================================================
// 7. UPDATE DRIVER AVAILABILITY (authenticated — own profile)
// driverId comes from the verified token — NOT from the body.
// ============================================================

exports.updateDriverAvailability = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Only POST requests are allowed",
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(req);
    } catch (authErr) {
      return res.status(authErr.status).json({
        success: false,
        message: authErr.message,
      });
    }

    // Driver identity comes from the verified token
    const driverId = decodedToken.uid;

    const body = req.body || {};
    const {isAvailable, isOnline} = body;

    // Verify the driver profile exists before updating
    const driverDoc = await db
        .collection("drivers")
        .doc(driverId)
        .get();

    if (!driverDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Driver profile not found",
      });
    }

    const updateData = {
      updatedAt: new Date().toISOString(),
    };

    if (isAvailable !== undefined) {
      updateData.isAvailable =
        isAvailable === true || isAvailable === "true";
    }

    if (isOnline !== undefined) {
      updateData.isOnline =
        isOnline === true || isOnline === "true";
    }

    await db
        .collection("drivers")
        .doc(driverId)
        .set(updateData, {merge: true});

    return res.status(200).json({
      success: true,
      message: "Driver availability updated",
    });
  } catch (error) {
    console.error("Availability error:", error);

    return safeInternalError(
        res,
        "Failed to update availability",
        "updateDriverAvailability",
        error);
  }
});

// ============================================================
// 8. GET AVAILABLE DRIVERS (authenticated)
// ============================================================

exports.getAvailableDrivers = onRequest(async (req, res) => {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        success: false,
        message: "Only GET requests are allowed",
      });
    }

    try {
      await verifyToken(req);
    } catch (authErr) {
      return res.status(authErr.status).json({
        success: false,
        message: authErr.message,
      });
    }

    const snapshot = await db
        .collection("drivers")
        .where("isAvailable", "==", true)
        .where("isOnline", "==", true)
        .get();

    const drivers = [];
    snapshot.forEach((doc) => {
      drivers.push(doc.data());
    });

    return res.status(200).json({
      success: true,
      count: drivers.length,
      drivers: drivers,
    });
  } catch (error) {
    console.error("Get drivers error:", error);

    return safeInternalError(
        res,
        "Failed to get available drivers",
        "getAvailableDrivers",
        error);
  }
});

// ============================================================
// 9. UPDATE RIDE STATUS (authenticated)
// Rules:
//   CANCELLED        — only the passenger may cancel.
//   ACCEPTED         — any authenticated driver may accept an
//                      unassigned (REQUESTED) ride; they become
//                      the assigned driver.
//   ARRIVING/STARTED/
//   COMPLETED        — only the assigned driver.
// All transitions are forward-only per VALID_TRANSITIONS.
// ============================================================

exports.updateRideStatus = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Only POST requests are allowed",
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(req);
    } catch (authErr) {
      return res.status(authErr.status).json({
        success: false,
        message: authErr.message,
      });
    }

    const callerUid = decodedToken.uid;
    const body = req.body || {};
    const {rideId, status} = body;

    if (!rideId || !status) {
      return res.status(400).json({
        success: false,
        message: "rideId and status are required",
      });
    }

    const allowedStatuses = Object.keys(VALID_TRANSITIONS);
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ride status",
      });
    }

    // Fetch the current ride state
    const rideDoc = await db.collection("rides").doc(rideId).get();
    if (!rideDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    const ride = rideDoc.data();
    const currentStatus = ride.status;

    // Enforce forward-only transition
    const validNext = VALID_TRANSITIONS[currentStatus] || [];
    if (!validNext.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          `Cannot transition ride from ${currentStatus} to ${status}`,
      });
    }

    const isPassenger = ride.passengerId === callerUid;
    const isAssignedDriver = ride.driverId === callerUid;

    // Authorization by transition type
    if (status === "CANCELLED") {
      // Only the passenger may cancel
      if (!isPassenger) {
        return res.status(403).json({
          success: false,
          message: "Only the passenger can cancel a ride",
        });
      }
    } else if (status === "ACCEPTED") {
      // Any authenticated driver may accept an unassigned ride.
      // The caller becomes the assigned driver.
      // (No further check needed — being authenticated is sufficient.)
    } else {
      // ARRIVING, STARTED, COMPLETED — only the assigned driver
      if (!isAssignedDriver) {
        return res.status(403).json({
          success: false,
          message:
            "Only the assigned driver can update this ride status",
        });
      }
    }

    const nowIso = new Date().toISOString();
    const updateData = {
      status: status,
      updatedAt: nowIso,
    };

    // Set authoritative server lifecycle timestamps
    if (status === "ACCEPTED") {
      updateData.acceptedAt = nowIso;
      updateData.driverId = callerUid;
      try {
        const driverDoc = await db
            .collection("drivers")
            .doc(callerUid)
            .get();
        if (driverDoc.exists) {
          const dData = driverDoc.data();
          updateData.driverName = dData.name || null;
          updateData.vehicleNumber = dData.vehicleNumber || null;
          updateData.vehicleModel = dData.vehicleModel || null;
          updateData.driverRating = dData.rating || null;
        }
      } catch (dErr) {
        // Non-blocking fallback
      }
    }

    if (status === "ARRIVING") {
      updateData.arrivingAt = nowIso;
    }

    if (status === "STARTED") {
      updateData.startedAt = nowIso;
    }

    if (status === "COMPLETED") {
      updateData.completedAt = nowIso;
    }

    if (status === "CANCELLED") {
      updateData.cancelledAt = nowIso;
    }

    await db
        .collection("rides")
        .doc(rideId)
        .set(updateData, {merge: true});

    // Safely dispatch push notifications to participants based on transition
    if (status === "ACCEPTED" && ride.passengerId) {
      sendPushNotificationToUser(ride.passengerId, {
        title: "Ride Accepted 🚗",
        body: "A driver has accepted your ride request.",
        data: {rideId, type: "RIDE_ACCEPTED"},
      }).catch(() => {});
    } else if (status === "ARRIVING" && ride.passengerId) {
      sendPushNotificationToUser(ride.passengerId, {
        title: "Driver Arriving 📍",
        body: "Your driver is arriving at your pickup location.",
        data: {rideId, type: "DRIVER_ARRIVING"},
      }).catch(() => {});
    } else if (status === "STARTED" && ride.passengerId) {
      sendPushNotificationToUser(ride.passengerId, {
        title: "Ride Started 🚀",
        body: "Your ride is underway.",
        data: {rideId, type: "RIDE_STARTED"},
      }).catch(() => {});
    } else if (status === "COMPLETED" && ride.passengerId) {
      sendPushNotificationToUser(ride.passengerId, {
        title: "Ride Completed ✅",
        body: "Your ride has ended. Thank you for riding with ChauffIQ!",
        data: {rideId, type: "RIDE_COMPLETED"},
      }).catch(() => {});
    } else if (status === "CANCELLED") {
      const recipient = isPassenger ? ride.driverId : ride.passengerId;
      if (recipient) {
        sendPushNotificationToUser(recipient, {
          title: "Ride Cancelled ❌",
          body: "The ride request was cancelled.",
          data: {rideId, type: "RIDE_CANCELLED"},
        }).catch(() => {});
      }
    }

    // Safely dispatch push notifications to active authorized family monitors
    try {
      const familySnap = await db
          .collection("familyMonitoring")
          .where("rideId", "==", rideId)
          .where("active", "==", true)
          .get();
      familySnap.forEach((fDoc) => {
        const fMemberId = fDoc.data().familyMemberId;
        if (fMemberId && fMemberId !== callerUid) {
          sendPushNotificationToUser(fMemberId, {
            title: `Family Trip: ${status} 🛡️`,
            body: `Monitored ride status is now ${status}.`,
            data: {rideId, type: `FAMILY_RIDE_${status}`},
          }).catch(() => {});
        }
      });
    } catch (fErr) {
      // Non-blocking
    }

    return res.status(200).json({
      success: true,
      message: "Ride status updated",
    });
  } catch (error) {
    console.error("Ride status error:", error);

    return safeInternalError(
        res, "Failed to update ride status", "updateRideStatus", error);
  }
});

// ============================================================
// 10. FAMILY MONITORING (authenticated — passenger only)
// The passenger enables monitoring for a family member.
// passengerId comes from the verified token — NOT from the body.
// The ride must belong to the authenticated passenger.
// ============================================================

exports.createFamilyMonitoring = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Only POST requests are allowed",
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(req);
    } catch (authErr) {
      return res.status(authErr.status).json({
        success: false,
        message: authErr.message,
      });
    }

    // The passenger enabling monitoring must be the authenticated user
    const passengerId = decodedToken.uid;

    const body = req.body || {};
    const {familyMemberId, rideId} = body;

    if (!familyMemberId || !rideId ||
        typeof familyMemberId !== "string" ||
        typeof rideId !== "string" ||
        familyMemberId.length > 128 ||
        rideId.length > 100) {
      return res.status(400).json({
        success: false,
        message: "familyMemberId and rideId are required",
      });
    }

    if (familyMemberId === passengerId) {
      return res.status(400).json({
        success: false,
        message: "Cannot add yourself as a family monitor",
      });
    }

    // Verify the ride exists and belongs to this authenticated passenger
    const rideDoc = await db.collection("rides").doc(rideId).get();
    if (!rideDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    if (rideDoc.data().passengerId !== passengerId) {
      return res.status(403).json({
        success: false,
        message: "You can only enable monitoring for your own rides",
      });
    }

    const monitoringRef = db.collection("familyMonitoring").doc();

    await monitoringRef.set({
      monitoringId: monitoringRef.id,
      familyMemberId: familyMemberId,
      passengerId: passengerId,
      rideId: rideId,
      active: true,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      message: "Family monitoring enabled",
      monitoringId: monitoringRef.id,
    });
  } catch (error) {
    console.error("Family monitoring error:", error);

    return safeInternalError(
        res,
        "Failed to enable family monitoring",
        "createFamilyMonitoring",
        error);
  }
});

// ============================================================
// 11. CREATE NOTIFICATION (authenticated — own user only)
// userId comes from the verified token — NOT from the body.
// A user may only create notifications for themselves.
// For system-initiated cross-user notifications, use an
// Admin SDK server-side call (not this public endpoint).
// ============================================================

exports.createNotification = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Only POST requests are allowed",
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(req);
    } catch (authErr) {
      return res.status(authErr.status).json({
        success: false,
        message: authErr.message,
      });
    }

    // Notification is always for the authenticated user
    const userId = decodedToken.uid;

    const body = req.body || {};
    const {title, message, type} = body;

    if (!title || !message ||
        typeof title !== "string" ||
        typeof message !== "string" ||
        title.trim().length === 0 ||
        message.trim().length === 0 ||
        title.length > 120 ||
        message.length > 500) {
      return res.status(400).json({
        success: false,
        message: "title (max 120) and message (max 500) are required",
      });
    }

    const notificationRef = db.collection("notifications").doc();

    await notificationRef.set({
      notificationId: notificationRef.id,
      userId: userId,
      title: title,
      message: message,
      type: type || "GENERAL",
      read: false,
      createdAt: new Date().toISOString(),
    });

    // Safely dispatch FCM push notification if user has registered tokens
    sendPushNotificationToUser(userId, {
      title: title,
      body: message,
      data: {
        type: type || "GENERAL",
        notificationId: notificationRef.id,
      },
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      message: "Notification created",
      notificationId: notificationRef.id,
    });
  } catch (error) {
    console.error("Notification error:", error);

    return safeInternalError(
        res,
        "Failed to create notification",
        "createNotification",
        error);
  }
});

// ============================================================
// 12. GET RIDE (authenticated)
// Accessible by: the passenger, the assigned driver, or an
// active authorized family member for this ride.
// ============================================================

exports.getRide = onRequest(async (req, res) => {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        success: false,
        message: "Only GET requests are allowed",
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(req);
    } catch (authErr) {
      return res.status(authErr.status).json({
        success: false,
        message: authErr.message,
      });
    }

    const callerUid = decodedToken.uid;
    const rideId = req.query.rideId;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "rideId is required",
      });
    }

    const rideDoc = await db.collection("rides").doc(rideId).get();
    if (!rideDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    const ride = rideDoc.data();
    const isPassenger = ride.passengerId === callerUid;
    const isAssignedDriver = ride.driverId === callerUid;

    let isFamilyMember = false;
    if (!isPassenger && !isAssignedDriver) {
      const familySnap = await db
          .collection("familyMonitoring")
          .where("rideId", "==", rideId)
          .where("familyMemberId", "==", callerUid)
          .where("active", "==", true)
          .limit(1)
          .get();
      isFamilyMember = !familySnap.empty;
    }

    if (!isPassenger && !isAssignedDriver && !isFamilyMember) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this ride",
      });
    }

    if (ride.driverId && !ride.driverName) {
      try {
        const driverDoc = await db
            .collection("drivers")
            .doc(ride.driverId)
            .get();
        if (driverDoc.exists) {
          const dData = driverDoc.data();
          ride.driverName = dData.name || null;
          ride.vehicleNumber = dData.vehicleNumber || null;
          ride.vehicleModel = dData.vehicleModel || null;
          ride.driverRating = dData.rating || null;
        }
      } catch (dErr) {
        // Non-blocking fallback
      }
    }

    if (!ride.requestedAt && ride.createdAt) {
      ride.requestedAt = ride.createdAt;
    }

    if (ride.passengerId && !ride.passengerName) {
      try {
        const passDoc = await db
            .collection("users")
            .doc(ride.passengerId)
            .get();
        if (passDoc.exists) {
          ride.passengerName = passDoc.data().name || "Passenger";
        }
      } catch (pErr) {
        // Non-blocking
      }
    }

    return res.status(200).json({
      success: true,
      ride: ride,
    });
  } catch (error) {
    console.error("Get ride error:", error);

    return safeInternalError(res, "Failed to get ride", "getRide", error);
  }
});

// ============================================================
// 13. LOGIN (public — no token required)
// Phase 2A fix: detects emulator vs production automatically.
// Emulator: uses FIREBASE_AUTH_EMULATOR_HOST + fake key.
// Production: uses real Google Identity Toolkit endpoint
//             with WEB_API_KEY environment variable.
// ============================================================

exports.login = rawOnRequest(
    {cors: ALLOWED_ORIGINS, secrets: [webApiKey]},
    async (req, res) => {
      if (req.method !== "POST") {
        return res.status(405).json({
          success: false,
          message: "Only POST requests are allowed",
        });
      }

      try {
        const rateLimit = await checkRateLimit(
            req, "login", 35, 15 * 60 * 1000);
        if (!rateLimit.allowed) {
          res.set("Retry-After", String(rateLimit.retryAfterSec));
          return res.status(429).json({
            success: false,
            message:
              "Too many login attempts. Please try again in " +
              `${rateLimit.retryAfterSec} seconds.`,
          });
        }

        const body = req.body || {};
        const {email, password} = body;

        if (!email || !password) {
          return res.status(400).json({
            success: false,
            message: "Email and password are required",
          });
        }

        // Detect emulator vs production environment
        const isEmulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;

        let authUrl;
        if (isEmulator) {
          // Emulator: route to local Auth emulator (fake key accepted)
          const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
          authUrl =
            `http://${authHost}/identitytoolkit.googleapis.com/v1/` +
            `accounts:signInWithPassword?key=fake-api-key`;
        } else {
          // Production: read secret from webApiKey with fallback
          const rawSecret =
            (typeof webApiKey.value === "function" ?
              webApiKey.value() :
              null) || process.env.WEB_API_KEY;
          let apiKey = typeof rawSecret === "string" ? rawSecret.trim() : "";
          if (
            (apiKey.startsWith("\"") && apiKey.endsWith("\"")) ||
            (apiKey.startsWith("'") && apiKey.endsWith("'"))
          ) {
            apiKey = apiKey.slice(1, -1).trim();
          }
          if (!apiKey) {
            console.error(
                "WEB_API_KEY is not configured or empty",
            );
            return res.status(500).json({
              success: false,
              message:
                "Server configuration error: authentication not configured",
            });
          }
          authUrl =
            `https://identitytoolkit.googleapis.com/v1/` +
            `accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;
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
          console.warn(
              "Identity Toolkit sign-in failed:",
              (authData.error && authData.error.message) || "unknown error",
          );
          return res.status(401).json({
            success: false,
            message: "Invalid email or password",
            error:
              (authData.error && authData.error.message) ||
              "Authentication failed",
          });
        }

        const userDoc = await db
            .collection("users")
            .doc(authData.localId)
            .get();

        let userData = null;
        if (userDoc.exists) {
          userData = userDoc.data();
        }

        let isAdmin = false;
        if (userData && userData.role === "ADMIN") {
          isAdmin = true;
        }
        const adminDoc = await db
            .collection("admins")
            .doc(authData.localId)
            .get();
        if (adminDoc.exists && adminDoc.data().active !== false) {
          isAdmin = true;
        }

        return res.status(200).json({
          success: true,
          message: "Login successful",
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
        });
      } catch (error) {
        console.error("Login error:", error);

        return safeInternalError(res, "Login failed", "login", error);
      }
    });

// ============================================================
// 14. SYNC USER PROFILE (authenticated via Firebase Auth token)
// Synchronizes or onboards a user's profile in Firestore using
// their verified token. Used by Firebase Phone Auth (or other
// direct Firebase Auth sign-in flows). UID is strictly taken
// from the verified token — NEVER from the request body.
// ============================================================

exports.syncUser = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Only POST requests are allowed",
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(req);
    } catch (authErr) {
      return res.status(authErr.status).json({
        success: false,
        message: authErr.message,
      });
    }

    const uid = decodedToken.uid;
    const tokenPhone = decodedToken.phone_number || "";
    const tokenEmail = decodedToken.email || "";

    const body = req.body || {};
    const {name, role} = body;

    const userDocRef = db.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      // New user onboarding via phone / direct auth
      const newUserData = {
        uid: uid,
        name: (typeof name === "string" && name.trim()) || "User",
        email: tokenEmail,
        phone: tokenPhone,
        role: role === "DRIVER" ? "DRIVER" : "PASSENGER",
        createdAt: new Date().toISOString(),
      };

      await userDocRef.set(newUserData);

      return res.status(201).json({
        success: true,
        message: "User profile created successfully",
        user: newUserData,
      });
    }

    // Existing user: check if phone number or profile should be synchronized
    const existingData = userDoc.data() || {};
    const updates = {};

    if (tokenPhone && existingData.phone !== tokenPhone) {
      updates.phone = tokenPhone;
    }
    if (typeof name === "string" && name.trim() && !existingData.name) {
      updates.name = name.trim();
    }
    if (role && (role === "PASSENGER" || role === "DRIVER") &&
        !existingData.role) {
      updates.role = role;
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date().toISOString();
      await userDocRef.set(updates, {merge: true});
    }

    const mergedUser = {
      uid: uid,
      name: updates.name || existingData.name || "User",
      email: existingData.email || tokenEmail || "",
      phone: updates.phone || existingData.phone || tokenPhone || "",
      role: updates.role || existingData.role || "PASSENGER",
    };

    return res.status(200).json({
      success: true,
      message: "User profile synchronized successfully",
      user: mergedUser,
    });
  } catch (error) {
    console.error("syncUser error:", error);
    return safeInternalError(
        res, "Failed to synchronize user profile", "syncUser", error);
  }
});

// ============================================================
// 15. REGISTER / UNREGISTER FCM TOKEN (authenticated)
// Associates a device FCM push token with the authenticated user.
// Stored in subcollection: users/{userId}/fcmTokens/{tokenId}
// Supports POST (register) and DELETE (unregister).
// ============================================================

exports.registerFcmToken = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST" && req.method !== "DELETE") {
      return res.status(405).json({
        success: false,
        message: "Only POST and DELETE requests are allowed",
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(req);
    } catch (authErr) {
      return res.status(authErr.status).json({
        success: false,
        message: authErr.message,
      });
    }

    const userId = decodedToken.uid;
    const body = req.body || {};
    const query = req.query || {};

    if (req.method === "POST") {
      const {token, deviceInfo} = body;

      if (!token || typeof token !== "string" || !token.trim() ||
          token.length > 4096) {
        return res.status(400).json({
          success: false,
          message: "token is required and must be a valid string (max 4096)",
        });
      }

      const trimmedToken = token.trim();
      const tokenId = crypto
          .createHash("sha256")
          .update(trimmedToken)
          .digest("hex");

      const tokenRef = db
          .collection("users")
          .doc(userId)
          .collection("fcmTokens")
          .doc(tokenId);

      const existingDoc = await tokenRef.get();
      const now = new Date().toISOString();

      const tokenData = {
        tokenId: tokenId,
        token: trimmedToken,
        userId: userId,
        deviceInfo: (deviceInfo && typeof deviceInfo === "object") ?
            deviceInfo :
            {},
        createdAt: existingDoc.exists ?
            existingDoc.data().createdAt || now :
            now,
        updatedAt: now,
      };

      await tokenRef.set(tokenData, {merge: true});

      return res.status(200).json({
        success: true,
        message: "FCM token registered successfully",
        tokenId: tokenId,
      });
    }

    if (req.method === "DELETE") {
      const token = body.token || query.token;
      let tokenId = body.tokenId || query.tokenId;

      if (!tokenId && token && typeof token === "string") {
        tokenId = crypto
            .createHash("sha256")
            .update(token.trim())
            .digest("hex");
      }

      if (!tokenId) {
        return res.status(400).json({
          success: false,
          message: "token or tokenId is required to unregister",
        });
      }

      await db
          .collection("users")
          .doc(userId)
          .collection("fcmTokens")
          .doc(tokenId)
          .delete();

      return res.status(200).json({
        success: true,
        message: "FCM token unregistered successfully",
      });
    }
  } catch (error) {
    console.error("registerFcmToken error:", error);
    return safeInternalError(
        res,
        "Failed to process FCM token request",
        "registerFcmToken",
        error);
  }
});

// ============================================================
// 16. GET TRIP HISTORY (authenticated)
// Returns authorized ride history for passengers, drivers, or family members.
// Supports status filtering (ALL, COMPLETED, CANCELLED, ACTIVE)
// and pagination limit (default 20, max 50).
// ============================================================

exports.getTripHistory = onRequest(async (req, res) => {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        success: false,
        message: "Only GET requests are allowed",
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(req);
    } catch (authErr) {
      return res.status(authErr.status).json({
        success: false,
        message: authErr.message,
      });
    }

    const callerUid = decodedToken.uid;
    const query = req.query || {};
    const role = (query.role || "ALL").toUpperCase();
    const statusFilter = (query.status || "ALL").toUpperCase();
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 50);

    const allowedRoles = ["PASSENGER", "DRIVER", "FAMILY", "ALL"];
    const allowedStatuses = ["ALL", "COMPLETED", "CANCELLED", "ACTIVE"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid role filter. Must be PASSENGER, DRIVER, FAMILY, or ALL",
      });
    }

    if (!allowedStatuses.includes(statusFilter)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status filter. Must be ALL, COMPLETED, CANCELLED, or ACTIVE",
      });
    }

    let rideDocs = [];

    if (role === "PASSENGER") {
      const snap = await db
          .collection("rides")
          .where("passengerId", "==", callerUid)
          .get();
      rideDocs = snap.docs;
    } else if (role === "DRIVER") {
      const snap = await db
          .collection("rides")
          .where("driverId", "==", callerUid)
          .get();
      rideDocs = snap.docs;
    } else if (role === "FAMILY") {
      const familySnap = await db
          .collection("familyMonitoring")
          .where("familyMemberId", "==", callerUid)
          .where("active", "==", true)
          .get();
      const rideIds = familySnap.docs.map((doc) => doc.data().rideId);
      if (rideIds.length > 0) {
        const fetches = rideIds.map((rId) =>
          db.collection("rides").doc(rId).get(),
        );
        const resolved = await Promise.all(fetches);
        rideDocs = resolved.filter((d) => d.exists);
      }
    } else {
      const [passSnap, drvSnap, familySnap] = await Promise.all([
        db.collection("rides").where("passengerId", "==", callerUid).get(),
        db.collection("rides").where("driverId", "==", callerUid).get(),
        db.collection("familyMonitoring")
            .where("familyMemberId", "==", callerUid)
            .where("active", "==", true)
            .get(),
      ]);

      const seen = new Set();
      const combined = [];

      passSnap.docs.forEach((d) => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          combined.push(d);
        }
      });
      drvSnap.docs.forEach((d) => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          combined.push(d);
        }
      });

      const familyRideIds = familySnap.docs.map((d) => d.data().rideId);
      if (familyRideIds.length > 0) {
        const familyFetches = familyRideIds
            .filter((rId) => !seen.has(rId))
            .map((rId) => db.collection("rides").doc(rId).get());
        const familyResolved = await Promise.all(familyFetches);
        familyResolved.forEach((d) => {
          if (d.exists && !seen.has(d.id)) {
            seen.add(d.id);
            combined.push(d);
          }
        });
      }

      rideDocs = combined;
    }

    let rides = rideDocs.map((doc) => {
      const data = doc.data();
      if (!data.requestedAt && data.createdAt) {
        data.requestedAt = data.createdAt;
      }
      return data;
    });

    if (statusFilter === "COMPLETED") {
      rides = rides.filter((r) => r.status === "COMPLETED");
    } else if (statusFilter === "CANCELLED") {
      rides = rides.filter((r) => r.status === "CANCELLED");
    } else if (statusFilter === "ACTIVE") {
      rides = rides.filter(
          (r) =>
            r.status === "REQUESTED" ||
            r.status === "ACCEPTED" ||
            r.status === "ARRIVING" ||
            r.status === "STARTED",
      );
    }

    rides.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.requestedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.requestedAt || 0).getTime();
      return timeB - timeA;
    });

    const paginatedRides = rides.slice(0, limit);

    return res.status(200).json({
      success: true,
      count: paginatedRides.length,
      total: rides.length,
      rides: paginatedRides,
    });
  } catch (error) {
    console.error("Get trip history error:", error);
    return safeInternalError(
        res, "Failed to get trip history", "getTripHistory", error);
  }
});


// ============================================================
// 17. SUBMIT RATING (authenticated — ride participant only)
// Allows passenger to rate driver, or driver to rate passenger.
// Requires ride status to be COMPLETED.
// Deterministic document ID prevents duplicate submissions:
// ratings/{rideId}_{fromUid}_{toUid}
// ============================================================

exports.submitRating = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Only POST requests are allowed",
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(req);
    } catch (authErr) {
      return res.status(authErr.status).json({
        success: false,
        message: authErr.message,
      });
    }

    const fromUid = decodedToken.uid;
    const body = req.body || {};
    const {rideId, rating, feedback} = body;

    // Validate rideId
    if (!rideId || typeof rideId !== "string" ||
        rideId.trim().length === 0 || rideId.length > 100) {
      return res.status(400).json({
        success: false,
        message: "rideId is required and must be a valid string",
      });
    }

    // Validate rating
    if (
      rating === undefined ||
      rating === null ||
      typeof rating !== "number" ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "rating must be an integer between 1 and 5",
      });
    }

    // Validate feedback
    let cleanFeedback = "";
    if (feedback !== undefined && feedback !== null) {
      if (typeof feedback !== "string") {
        return res.status(400).json({
          success: false,
          message: "feedback must be a string",
        });
      }
      if (feedback.trim().length > 1000) {
        return res.status(400).json({
          success: false,
          message: "feedback must not exceed 1000 characters",
        });
      }
      cleanFeedback = feedback.trim();
    }

    // Fetch the ride document
    const rideDoc = await db.collection("rides").doc(rideId).get();
    if (!rideDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    const ride = rideDoc.data();

    // Verify ride status is COMPLETED
    if (ride.status !== "COMPLETED") {
      return res.status(400).json({
        success: false,
        message:
          `Cannot rate a ride with status ${ride.status}. Must be COMPLETED`,
      });
    }

    // Verify caller is a participant in this ride
    const isPassenger = ride.passengerId === fromUid;
    const isDriver = ride.driverId === fromUid;

    if (!isPassenger && !isDriver) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this ride",
      });
    }

    const fromRole = isPassenger ? "PASSENGER" : "DRIVER";
    const toRole = isPassenger ? "DRIVER" : "PASSENGER";
    const toUid = isPassenger ? ride.driverId : ride.passengerId;

    if (!toUid) {
      return res.status(400).json({
        success: false,
        message: "Target participant not found on this ride",
      });
    }

    // Reject self-rating
    if (fromUid === toUid) {
      return res.status(400).json({
        success: false,
        message: "You cannot rate yourself",
      });
    }

    // Deterministic rating ID prevents duplicate submissions
    const ratingId = `${rideId}_${fromUid}_${toUid}`;
    const ratingRef = db.collection("ratings").doc(ratingId);
    const existingRating = await ratingRef.get();

    if (existingRating.exists) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a rating for this ride",
      });
    }

    const nowIso = new Date().toISOString();
    const ratingData = {
      ratingId: ratingId,
      rideId: rideId,
      fromUid: fromUid,
      toUid: toUid,
      fromRole: fromRole,
      toRole: toRole,
      rating: rating,
      feedback: cleanFeedback,
      createdAt: nowIso,
    };

    await ratingRef.set(ratingData);

    // Atomically update target user/driver aggregate rating
    try {
      if (toRole === "DRIVER") {
        const driverRef = db.collection("drivers").doc(toUid);
        const driverDoc = await driverRef.get();
        if (driverDoc.exists) {
          const dData = driverDoc.data() || {};
          const currentCount = Number(dData.ratingCount) || 0;
          const currentTotal = Number(dData.ratingTotal) ||
            (currentCount > 0 ?
              (Number(dData.rating) || 5) * currentCount :
              0);
          const newCount = currentCount + 1;
          const newTotal = currentTotal + rating;
          const newAverage = Math.round((newTotal / newCount) * 10) / 10;

          await driverRef.set({
            ratingCount: newCount,
            ratingTotal: newTotal,
            ratingAverage: newAverage,
            rating: newAverage,
            updatedAt: nowIso,
          }, {merge: true});
        }
      } else if (toRole === "PASSENGER") {
        const userRef = db.collection("users").doc(toUid);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          const uData = userDoc.data() || {};
          const currentCount = Number(uData.ratingCount) || 0;
          const currentTotal = Number(uData.ratingTotal) ||
            (currentCount > 0 ?
              (Number(uData.rating) || 5) * currentCount :
              0);
          const newCount = currentCount + 1;
          const newTotal = currentTotal + rating;
          const newAverage = Math.round((newTotal / newCount) * 10) / 10;

          await userRef.set({
            ratingCount: newCount,
            ratingTotal: newTotal,
            ratingAverage: newAverage,
            rating: newAverage,
            updatedAt: nowIso,
          }, {merge: true});
        }
      }
    } catch (aggErr) {
      log.error("submitRating", "Failed to update rating aggregate", aggErr);
    }

    return res.status(201).json({
      success: true,
      message: "Rating submitted successfully",
      ratingId: ratingId,
      rating: ratingData,
    });
  } catch (error) {
    return safeInternalError(
        res, "Failed to submit rating", "submitRating", error);
  }
});

// ============================================================
// 18. GET RIDE RATINGS (authenticated — ride participant only)
// Returns all ratings associated with a completed ride.
// Only participants (passenger or driver) may view ratings.
// ============================================================

exports.getRideRatings = onRequest(async (req, res) => {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        success: false,
        message: "Only GET requests are allowed",
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(req);
    } catch (authErr) {
      return res.status(authErr.status).json({
        success: false,
        message: authErr.message,
      });
    }

    const callerUid = decodedToken.uid;
    const rideId = req.query.rideId;

    if (!rideId || typeof rideId !== "string" ||
        rideId.trim().length === 0 || rideId.length > 100) {
      return res.status(400).json({
        success: false,
        message: "rideId is required and must be a valid string",
      });
    }

    const rideDoc = await db.collection("rides").doc(rideId).get();
    if (!rideDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    const ride = rideDoc.data();
    const isPassenger = ride.passengerId === callerUid;
    const isDriver = ride.driverId === callerUid;

    let isFamilyMember = false;
    if (!isPassenger && !isDriver) {
      const familySnap = await db
          .collection("familyMonitoring")
          .where("rideId", "==", rideId)
          .where("familyMemberId", "==", callerUid)
          .where("active", "==", true)
          .limit(1)
          .get();
      isFamilyMember = !familySnap.empty;
    }

    if (!isPassenger && !isDriver && !isFamilyMember) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to ratings for this ride",
      });
    }

    const ratingsSnap = await db
        .collection("ratings")
        .where("rideId", "==", rideId)
        .get();

    const ratings = [];
    ratingsSnap.forEach((doc) => {
      ratings.push(doc.data());
    });

    return res.status(200).json({
      success: true,
      rideId: rideId,
      ratings: ratings,
    });
  } catch (error) {
    return safeInternalError(
        res, "Failed to get ride ratings", "getRideRatings", error);
  }
});

// ============================================================
// 19. CREATE PAYMENT (authenticated — passenger only)
// Sandbox/Test mode only.
// Authoritatively calculates fare server-side in integer paise.
// Idempotently returns existing payment or creates PENDING payment.
// ============================================================

exports.createPayment = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Only POST requests are allowed",
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(req);
    } catch (authErr) {
      return res.status(authErr.status).json({
        success: false,
        message: authErr.message,
      });
    }

    const payerUid = decodedToken.uid;
    const body = req.body || {};
    const {rideId} = body;

    // Validate rideId
    if (!rideId || typeof rideId !== "string" ||
        rideId.trim().length === 0 || rideId.length > 100) {
      return res.status(400).json({
        success: false,
        message: "rideId is required and must be a valid string",
      });
    }

    // Fetch ride document
    const rideDoc = await db.collection("rides").doc(rideId).get();
    if (!rideDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    const ride = rideDoc.data();

    // Verify caller is the passenger who owns this ride
    if (ride.passengerId !== payerUid) {
      return res.status(403).json({
        success: false,
        message: "Only the passenger who booked this ride may create a payment",
      });
    }

    // Verify ride status is COMPLETED
    if (ride.status !== "COMPLETED") {
      return res.status(400).json({
        success: false,
        message:
          `Cannot create payment for ride with status ${ride.status}. ` +
          "Must be COMPLETED",
      });
    }

    // Deterministic paymentId: pay_${rideId} ensures idempotency
    const paymentId = `pay_${rideId}`;
    const paymentRef = db.collection("payments").doc(paymentId);
    const existingPayment = await paymentRef.get();

    if (existingPayment.exists) {
      const existingData = existingPayment.data();
      // If already active or terminal success, return idempotently
      if (
        existingData.status === "PENDING" ||
        existingData.status === "AUTHORIZED" ||
        existingData.status === "SUCCEEDED"
      ) {
        return res.status(200).json({
          success: true,
          message: "Payment record already exists (idempotent)",
          paymentId: paymentId,
          payment: existingData,
        });
      }
    }

    // Authoritative server-side fare calculation (integer minor units - paise)
    // Base fare: 25000 paise (₹250.00) + distance factor
    const baseFarePaise = 25000;
    const pickupLen = (ride.pickup && ride.pickup.length) || 10;
    const destLen = (ride.destination && ride.destination.length) || 10;
    const variableFarePaise = Math.min(50000, (pickupLen + destLen) * 500);
    const totalAmountPaise = baseFarePaise + variableFarePaise;

    const nowIso = new Date().toISOString();
    const providerPaymentId = `sbx_pay_${rideId}_${Date.now()}`;

    const paymentData = {
      paymentId: paymentId,
      rideId: rideId,
      payerUid: payerUid,
      payeeUid: ride.driverId || null,
      amount: totalAmountPaise,
      currency: "INR",
      status: "PENDING",
      provider: "SANDBOX",
      providerPaymentId: providerPaymentId,
      isSandbox: true,
      createdAt: nowIso,
      updatedAt: nowIso,
      completedAt: null,
      failureReason: null,
    };

    await paymentRef.set(paymentData);

    return res.status(201).json({
      success: true,
      message: "Sandbox payment initiated successfully",
      paymentId: paymentId,
      payment: paymentData,
    });
  } catch (error) {
    return safeInternalError(
        res, "Failed to create payment", "createPayment", error);
  }
});

// ============================================================
// 20. GET PAYMENT (authenticated — passenger, driver, family)
// Returns sanitized payment details for a ride or payment ID.
// ============================================================

exports.getPayment = onRequest(async (req, res) => {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        success: false,
        message: "Only GET requests are allowed",
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(req);
    } catch (authErr) {
      return res.status(authErr.status).json({
        success: false,
        message: authErr.message,
      });
    }

    const callerUid = decodedToken.uid;
    const {paymentId, rideId} = req.query;

    let targetPaymentId = paymentId;
    if (!targetPaymentId && rideId) {
      targetPaymentId = `pay_${rideId}`;
    }

    if (!targetPaymentId || typeof targetPaymentId !== "string" ||
        targetPaymentId.trim().length === 0 || targetPaymentId.length > 120) {
      return res.status(400).json({
        success: false,
        message: "paymentId or rideId is required",
      });
    }

    const paymentDoc = await db
        .collection("payments")
        .doc(targetPaymentId)
        .get();

    if (!paymentDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const payment = paymentDoc.data();

    // Check authorization: payer, payee, or authorized family member
    const isPayer = payment.payerUid === callerUid;
    const isPayee = payment.payeeUid === callerUid;

    let isFamily = false;
    if (!isPayer && !isPayee && payment.rideId) {
      const familySnap = await db
          .collection("familyMonitoring")
          .where("rideId", "==", payment.rideId)
          .where("familyMemberId", "==", callerUid)
          .where("active", "==", true)
          .limit(1)
          .get();
      isFamily = !familySnap.empty;
    }

    if (!isPayer && !isPayee && !isFamily) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this payment",
      });
    }

    return res.status(200).json({
      success: true,
      paymentId: targetPaymentId,
      payment: payment,
    });
  } catch (error) {
    return safeInternalError(
        res, "Failed to retrieve payment", "getPayment", error);
  }
});

// ============================================================
// 21. SIMULATE PAYMENT RESULT (authenticated — passenger only)
// SANDBOX ONLY. Updates payment state through valid state transitions.
// Accepts only predefined outcomes: SUCCESS | FAILURE | CANCEL
// ============================================================

exports.simulatePaymentResult = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Only POST requests are allowed",
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(req);
    } catch (authErr) {
      return res.status(authErr.status).json({
        success: false,
        message: authErr.message,
      });
    }

    const callerUid = decodedToken.uid;
    const body = req.body || {};
    const {paymentId, outcome} = body;

    // Validate paymentId
    if (!paymentId || typeof paymentId !== "string" ||
        paymentId.trim().length === 0 || paymentId.length > 120) {
      return res.status(400).json({
        success: false,
        message: "paymentId is required and must be a valid string",
      });
    }

    // Validate outcome: strictly SUCCESS, FAILURE, or CANCEL
    const validOutcomes = ["SUCCESS", "FAILURE", "CANCEL"];
    if (!outcome || !validOutcomes.includes(outcome)) {
      return res.status(400).json({
        success: false,
        message: "outcome must be one of: SUCCESS, FAILURE, CANCEL",
      });
    }

    const paymentRef = db.collection("payments").doc(paymentId);
    const paymentDoc = await paymentRef.get();

    if (!paymentDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const payment = paymentDoc.data();

    // Verify caller is the payer (passenger)
    if (payment.payerUid !== callerUid) {
      return res.status(403).json({
        success: false,
        message: "Only the payer can simulate outcomes for this payment",
      });
    }

    // Verify current status allows transition (must be PENDING or AUTHORIZED)
    if (payment.status !== "PENDING" && payment.status !== "AUTHORIZED") {
      return res.status(400).json({
        success: false,
        message:
          `Cannot simulate outcome for status ${payment.status}. ` +
          "Terminal states are immutable",
      });
    }

    const nowIso = new Date().toISOString();
    let newStatus = "SUCCEEDED";
    let failureReason = null;

    if (outcome === "SUCCESS") {
      newStatus = "SUCCEEDED";
    } else if (outcome === "FAILURE") {
      newStatus = "FAILED";
      failureReason = "SANDBOX_SIMULATED_FAILURE";
    } else if (outcome === "CANCEL") {
      newStatus = "CANCELLED";
      failureReason = "SANDBOX_CUSTOMER_CANCELLED";
    }

    const updates = {
      status: newStatus,
      updatedAt: nowIso,
      completedAt: nowIso,
      failureReason: failureReason,
    };

    await paymentRef.update(updates);

    const updatedPayment = {
      ...payment,
      ...updates,
    };

    return res.status(200).json({
      success: true,
      message: `Sandbox payment updated to ${newStatus}`,
      payment: updatedPayment,
    });
  } catch (error) {
    return safeInternalError(
        res, "Failed to simulate payment", "simulatePaymentResult", error);
  }
});


// ============================================================
// PHASE 14 — ADMIN DASHBOARD & OPERATIONAL VISIBILITY APIS
// ============================================================

/**
 * 22. BOOTSTRAP ADMIN (Developer-Controlled Setup Only)
 * Allows bootstrapping the initial administrator or designating admins.
 * Requires valid token AND developer-controlled bootstrap secret header.
 */
exports.bootstrapAdmin = rawOnRequest(
    {cors: ALLOWED_ORIGINS, invoker: "public", secrets: [adminBootstrapSecret]},
    async (req, res) => {
      if (req.method !== "POST") {
        return res.status(405).json({
          success: false,
          message: "Only POST requests are allowed",
        });
      }

      try {
        const decodedToken = await verifyToken(req);
        const uid = decodedToken.uid;

        const providedSecret =
          req.headers["x-admin-bootstrap-key"] ||
          req.headers["x-bootstrap-key"] ||
          "";

        const isExistingAdminDoc =
          (await db.collection("admins").doc(uid).get()).exists;
        const isExistingAdmin =
          decodedToken.admin === true || isExistingAdminDoc;

        let activeSecret = null;
        try {
          if (typeof adminBootstrapSecret.value === "function") {
            activeSecret = adminBootstrapSecret.value();
          }
        } catch (_) {
          // Secret manager may not be active in local unit test environment
        }
        if (!activeSecret) {
          activeSecret = process.env.ADMIN_BOOTSTRAP_SECRET || null;
        }

        let secretValid = false;
        if (activeSecret &&
            typeof providedSecret === "string" &&
            providedSecret.length > 0) {
          const bufProvided = Buffer.from(providedSecret, "utf8");
          const bufActive = Buffer.from(activeSecret, "utf8");
          if (bufProvided.length === bufActive.length) {
            secretValid = crypto.timingSafeEqual(bufProvided, bufActive);
          }
        }

        if (!secretValid && !isExistingAdmin) {
          log.warn(
              "bootstrapAdmin",
              `Unauthorized bootstrap attempt by ${uid}`,
          );
          return res.status(403).json({
            success: false,
            message:
              "Unauthorized: Invalid or missing administrator bootstrap key",
          });
        }

        // Set custom claims on Firebase Auth
        await auth.setCustomUserClaims(uid, {admin: true, role: "ADMIN"});

        // Write server-authoritative admin record
        await db.collection("admins").doc(uid).set({
          uid: uid,
          email: decodedToken.email || "",
          active: true,
          role: "ADMIN",
          grantedAt: new Date().toISOString(),
        }, {merge: true});

        // Update user profile role for UI display
        await db.collection("users").doc(uid).set({
          role: "ADMIN",
        }, {merge: true});

        logAdminAction(
            uid,
            "BOOTSTRAP_ADMIN",
            uid,
            {email: decodedToken.email},
        );

        return res.status(200).json({
          success: true,
          message: "User successfully designated as Administrator",
          uid: uid,
        });
      } catch (err) {
        if (err instanceof AuthError) {
          return res.status(err.status).json({
            success: false,
            message: err.message,
          });
        }
        return safeInternalError(
            res, "Failed to bootstrap admin", "bootstrapAdmin", err);
      }
    });

/**
 * 23. GET ADMIN OVERVIEW
 * Returns aggregated operational metrics across users, drivers, rides,
 * payments, and ratings.
 */
exports.getAdminOverview = onRequest(async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = await verifyAdmin(req);
    logAdminAction(decodedToken.uid, "GET_OVERVIEW");

    const [usersSnap, driversSnap, ridesSnap, paymentsSnap, ratingsSnap] =
      await Promise.all([
        db.collection("users").get(),
        db.collection("drivers").get(),
        db.collection("rides").get(),
        db.collection("payments").get(),
        db.collection("ratings").get(),
      ]);

    let passengerCount = 0;
    let driverCount = 0;
    let adminCount = 0;
    usersSnap.forEach((doc) => {
      const r = (doc.data().role || "").toUpperCase();
      if (r === "DRIVER") driverCount++;
      else if (r === "ADMIN") adminCount++;
      else passengerCount++;
    });

    let availableDrivers = 0;
    let unavailableDrivers = 0;
    driversSnap.forEach((doc) => {
      if (doc.data().isAvailable) availableDrivers++;
      else unavailableDrivers++;
    });

    const rideStatusCounts = {
      REQUESTED: 0,
      ACCEPTED: 0,
      ARRIVING: 0,
      STARTED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    ridesSnap.forEach((doc) => {
      const st = doc.data().status;
      if (rideStatusCounts[st] !== undefined) {
        rideStatusCounts[st]++;
      }
    });

    const paymentStatusCounts = {
      PENDING: 0,
      AUTHORIZED: 0,
      SUCCEEDED: 0,
      FAILED: 0,
      CANCELLED: 0,
      REFUNDED: 0,
    };
    let totalVolumePaise = 0;
    paymentsSnap.forEach((doc) => {
      const st = doc.data().status;
      if (paymentStatusCounts[st] !== undefined) {
        paymentStatusCounts[st]++;
      }
      if (st === "SUCCEEDED" && Number.isInteger(doc.data().amount)) {
        totalVolumePaise += doc.data().amount;
      }
    });

    let ratingCount = 0;
    let driverRatingSum = 0;
    let driverRatingCount = 0;
    let passengerRatingSum = 0;
    let passengerRatingCount = 0;
    ratingsSnap.forEach((doc) => {
      const d = doc.data();
      const val = Number(d.rating);
      if (val >= 1 && val <= 5) {
        ratingCount++;
        if (d.toRole === "DRIVER") {
          driverRatingSum += val;
          driverRatingCount++;
        } else if (d.toRole === "PASSENGER") {
          passengerRatingSum += val;
          passengerRatingCount++;
        }
      }
    });

    const averageDriverRating = driverRatingCount > 0 ?
      Number((driverRatingSum / driverRatingCount).toFixed(1)) :
      5.0;
    const averagePassengerRating = passengerRatingCount > 0 ?
      Number((passengerRatingSum / passengerRatingCount).toFixed(1)) :
      5.0;

    return res.status(200).json({
      success: true,
      overview: {
        users: {
          total: usersSnap.size,
          passengers: passengerCount,
          drivers: driverCount,
          admins: adminCount,
        },
        drivers: {
          total: driversSnap.size,
          available: availableDrivers,
          unavailable: unavailableDrivers,
        },
        rides: {
          total: ridesSnap.size,
          ...rideStatusCounts,
        },
        payments: {
          total: paymentsSnap.size,
          totalVolumePaise: totalVolumePaise,
          totalVolumeRupees: Number((totalVolumePaise / 100).toFixed(2)),
          currency: "INR",
          isSandbox: true,
          provider: "SANDBOX",
          ...paymentStatusCounts,
        },
        ratings: {
          total: ratingCount,
          averageDriverRating: averageDriverRating,
          driverRatingCount: driverRatingCount,
          averagePassengerRating: averagePassengerRating,
          passengerRatingCount: passengerRatingCount,
        },
        system: {
          status: "OPERATIONAL",
          region: "asia-southeast1",
          backend: "HEALTHY",
          firestore: "CONNECTED",
          hosting: "ACTIVE",
          isSandboxPayment: true,
        },
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    return safeInternalError(
        res, "Failed to get admin overview", "getAdminOverview", err);
  }
});

/**
 * 24. GET ADMIN USERS
 * Paginated, sanitized list of registered users.
 */
exports.getAdminUsers = onRequest(async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = await verifyAdmin(req);
    logAdminAction(decodedToken.uid, "GET_USERS");

    const limitParam = parseInt(req.query.limit, 10);
    if (
      req.query.limit !== undefined &&
      (isNaN(limitParam) || limitParam < 1)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit parameter. Must be a positive integer.",
      });
    }
    const limit = Math.min(isNaN(limitParam) ? 25 : limitParam, 100);

    const roleParam =
      typeof req.query.role === "string" ?
        req.query.role.trim().toUpperCase() :
        "";
    if (roleParam && !["PASSENGER", "DRIVER", "ADMIN"].includes(roleParam)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role filter. Allowed: PASSENGER, DRIVER, ADMIN",
      });
    }

    const startAfter =
      typeof req.query.startAfter === "string" ?
        req.query.startAfter.trim() :
        "";
    const search =
      typeof req.query.search === "string" ?
        req.query.search.trim().toLowerCase() :
        "";

    let query = db.collection("users").orderBy("createdAt", "desc");
    if (roleParam) {
      query = db
          .collection("users")
          .where("role", "==", roleParam)
          .orderBy("createdAt", "desc");
    }

    if (startAfter) {
      const startDoc = await db.collection("users").doc(startAfter).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }

    const snapshot = await query.limit(limit + 1).get();
    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    let users = docs.map((d) => {
      const data = d.data();
      return {
        uid: data.uid || d.id,
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        role: data.role || "PASSENGER",
        createdAt: data.createdAt || "",
      };
    });

    if (search) {
      users = users.filter((u) =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        u.phone.toLowerCase().includes(search) ||
        u.uid.toLowerCase().includes(search),
      );
    }

    const nextCursor = docs.length > 0 ? docs[docs.length - 1].id : null;

    return res.status(200).json({
      success: true,
      users: users,
      totalCount: users.length,
      hasMore: hasMore,
      nextCursor: nextCursor,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    return safeInternalError(
        res, "Failed to get admin users", "getAdminUsers", err);
  }
});

/**
 * 25. GET ADMIN DRIVERS
 * Paginated list of registered drivers with vehicle details and ratings.
 */
exports.getAdminDrivers = onRequest(async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = await verifyAdmin(req);
    logAdminAction(decodedToken.uid, "GET_DRIVERS");

    const limitParam = parseInt(req.query.limit, 10);
    if (
      req.query.limit !== undefined &&
      (isNaN(limitParam) || limitParam < 1)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit parameter. Must be a positive integer.",
      });
    }
    const limit = Math.min(isNaN(limitParam) ? 25 : limitParam, 100);

    const startAfter =
      typeof req.query.startAfter === "string" ?
        req.query.startAfter.trim() :
        "";

    let query = db.collection("drivers").orderBy("createdAt", "desc");
    if (req.query.isAvailable !== undefined) {
      const isAvail = req.query.isAvailable === "true";
      query = db
          .collection("drivers")
          .where("isAvailable", "==", isAvail)
          .orderBy("createdAt", "desc");
    }

    if (startAfter) {
      const startDoc = await db.collection("drivers").doc(startAfter).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }

    const snapshot = await query.limit(limit + 1).get();
    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    const drivers = docs.map((d) => {
      const data = d.data();
      return {
        uid: data.uid || d.id,
        name: data.name || "",
        phone: data.phone || "",
        vehicleNumber: data.vehicleNumber || "",
        vehicleModel: data.vehicleModel || "",
        rating: data.rating || 5,
        ratingAverage:
          data.ratingAverage !== undefined ?
            data.ratingAverage : data.rating || 5,
        ratingCount: data.ratingCount || 0,
        isAvailable: data.isAvailable !== false,
        isOnline: data.isOnline !== false,
        totalTrips: data.totalTrips || 0,
        createdAt: data.createdAt || "",
        updatedAt: data.updatedAt || "",
      };
    });

    const nextCursor = docs.length > 0 ? docs[docs.length - 1].id : null;

    return res.status(200).json({
      success: true,
      drivers: drivers,
      totalCount: drivers.length,
      hasMore: hasMore,
      nextCursor: nextCursor,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    return safeInternalError(
        res, "Failed to get admin drivers", "getAdminDrivers", err);
  }
});

/**
 * 26. GET ADMIN RIDES
 * Paginated list of rides with lifecycle timestamps and participant IDs.
 */
exports.getAdminRides = onRequest(async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = await verifyAdmin(req);
    logAdminAction(decodedToken.uid, "GET_RIDES");

    const limitParam = parseInt(req.query.limit, 10);
    if (
      req.query.limit !== undefined &&
      (isNaN(limitParam) || limitParam < 1)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit parameter. Must be a positive integer.",
      });
    }
    const limit = Math.min(isNaN(limitParam) ? 25 : limitParam, 100);

    const statusParam =
      typeof req.query.status === "string" ?
        req.query.status.trim().toUpperCase() :
        "";
    const validStatuses = [
      "REQUESTED",
      "ACCEPTED",
      "ARRIVING",
      "STARTED",
      "COMPLETED",
      "CANCELLED",
    ];
    if (statusParam && !validStatuses.includes(statusParam)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status filter. Allowed: ${validStatuses.join(", ")}`,
      });
    }

    const startAfter =
      typeof req.query.startAfter === "string" ?
        req.query.startAfter.trim() :
        "";

    let query = db.collection("rides").orderBy("createdAt", "desc");
    if (statusParam) {
      query = db
          .collection("rides")
          .where("status", "==", statusParam)
          .orderBy("createdAt", "desc");
    }

    if (startAfter) {
      const startDoc = await db.collection("rides").doc(startAfter).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }

    const snapshot = await query.limit(limit + 1).get();
    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    const rides = docs.map((d) => {
      const data = d.data();
      return {
        rideId: data.rideId || d.id,
        passengerId: data.passengerId || "",
        driverId: data.driverId || "",
        pickup: data.pickup || "",
        destination: data.destination || "",
        status: data.status || "REQUESTED",
        requestedAt: data.requestedAt || data.createdAt || "",
        acceptedAt: data.acceptedAt || "",
        arrivingAt: data.arrivingAt || "",
        startedAt: data.startedAt || "",
        completedAt: data.completedAt || "",
        cancelledAt: data.cancelledAt || "",
        createdAt: data.createdAt || "",
        updatedAt: data.updatedAt || "",
      };
    });

    const nextCursor = docs.length > 0 ? docs[docs.length - 1].id : null;

    return res.status(200).json({
      success: true,
      rides: rides,
      totalCount: rides.length,
      hasMore: hasMore,
      nextCursor: nextCursor,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    return safeInternalError(
        res, "Failed to get admin rides", "getAdminRides", err);
  }
});

/**
 * 27. GET ADMIN PAYMENTS
 * Paginated list of sandbox payment transactions (read-only).
 */
exports.getAdminPayments = onRequest(async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = await verifyAdmin(req);
    logAdminAction(decodedToken.uid, "GET_PAYMENTS");

    const limitParam = parseInt(req.query.limit, 10);
    if (
      req.query.limit !== undefined &&
      (isNaN(limitParam) || limitParam < 1)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit parameter. Must be a positive integer.",
      });
    }
    const limit = Math.min(isNaN(limitParam) ? 25 : limitParam, 100);

    const statusParam =
      typeof req.query.status === "string" ?
        req.query.status.trim().toUpperCase() :
        "";
    const validStatuses = [
      "PENDING",
      "AUTHORIZED",
      "SUCCEEDED",
      "FAILED",
      "CANCELLED",
      "REFUNDED",
    ];
    if (statusParam && !validStatuses.includes(statusParam)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status filter. Allowed: ${validStatuses.join(", ")}`,
      });
    }

    const startAfter =
      typeof req.query.startAfter === "string" ?
        req.query.startAfter.trim() :
        "";

    let query = db.collection("payments").orderBy("createdAt", "desc");
    if (statusParam) {
      query = db
          .collection("payments")
          .where("status", "==", statusParam)
          .orderBy("createdAt", "desc");
    }

    if (startAfter) {
      const startDoc = await db.collection("payments").doc(startAfter).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }

    const snapshot = await query.limit(limit + 1).get();
    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    const payments = docs.map((d) => {
      const data = d.data();
      return {
        paymentId: data.paymentId || d.id,
        rideId: data.rideId || "",
        payerUid: data.payerUid || "",
        payeeUid: data.payeeUid || "",
        amount: data.amount || 0,
        currency: data.currency || "INR",
        status: data.status || "PENDING",
        provider: "SANDBOX",
        isSandbox: true,
        createdAt: data.createdAt || "",
        updatedAt: data.updatedAt || "",
        completedAt: data.completedAt || "",
        failedAt: data.failedAt || "",
        cancelledAt: data.cancelledAt || "",
      };
    });

    const nextCursor = docs.length > 0 ? docs[docs.length - 1].id : null;

    return res.status(200).json({
      success: true,
      payments: payments,
      totalCount: payments.length,
      hasMore: hasMore,
      nextCursor: nextCursor,
      isSandbox: true,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    return safeInternalError(
        res, "Failed to get admin payments", "getAdminPayments", err);
  }
});

/**
 * 28. GET ADMIN RATINGS
 * Paginated list of customer and driver ratings with feedback.
 */
exports.getAdminRatings = onRequest(async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = await verifyAdmin(req);
    logAdminAction(decodedToken.uid, "GET_RATINGS");

    const limitParam = parseInt(req.query.limit, 10);
    if (
      req.query.limit !== undefined &&
      (isNaN(limitParam) || limitParam < 1)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit parameter. Must be a positive integer.",
      });
    }
    const limit = Math.min(isNaN(limitParam) ? 25 : limitParam, 100);

    const startAfter =
      typeof req.query.startAfter === "string" ?
        req.query.startAfter.trim() :
        "";

    let query = db.collection("ratings").orderBy("createdAt", "desc");
    if (startAfter) {
      const startDoc = await db.collection("ratings").doc(startAfter).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }

    const snapshot = await query.limit(limit + 1).get();
    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    const ratings = docs.map((d) => {
      const data = d.data();
      return {
        ratingId: data.ratingId || d.id,
        rideId: data.rideId || "",
        fromUid: data.fromUid || "",
        toUid: data.toUid || "",
        fromRole: data.fromRole || "",
        toRole: data.toRole || "",
        rating: data.rating || 5,
        feedback: data.feedback || "",
        createdAt: data.createdAt || "",
      };
    });

    const nextCursor = docs.length > 0 ? docs[docs.length - 1].id : null;

    return res.status(200).json({
      success: true,
      ratings: ratings,
      totalCount: ratings.length,
      hasMore: hasMore,
      nextCursor: nextCursor,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    return safeInternalError(
        res, "Failed to get admin ratings", "getAdminRatings", err);
  }
});

/**
 * 29. GET ADMIN RIDE DETAILS
 * Deep operational inspection of a single ride including participants,
 * sandbox payment, and ratings.
 */
exports.getAdminRideDetails = onRequest(async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = await verifyAdmin(req);
    const rideId =
      typeof req.query.rideId === "string" ? req.query.rideId.trim() : "";
    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "rideId parameter is required",
      });
    }

    logAdminAction(decodedToken.uid, "GET_RIDE_DETAILS", rideId);

    const rideDoc = await db.collection("rides").doc(rideId).get();
    if (!rideDoc.exists) {
      return res.status(404).json({success: false, message: "Ride not found"});
    }
    const rideData = rideDoc.data();

    const [passengerDoc, driverDoc, paymentDoc, ratingsSnap] =
      await Promise.all([
        rideData.passengerId ?
          db.collection("users").doc(rideData.passengerId).get() :
          null,
        rideData.driverId ?
          db.collection("drivers").doc(rideData.driverId).get() :
          null,
        db.collection("payments").doc(`pay_${rideId}`).get(),
        db.collection("ratings").where("rideId", "==", rideId).get(),
      ]);

    const passenger =
      passengerDoc && passengerDoc.exists ?
        {
          uid: passengerDoc.id,
          name: passengerDoc.data().name || "",
          email: passengerDoc.data().email || "",
          phone: passengerDoc.data().phone || "",
        } :
        null;

    const driver =
      driverDoc && driverDoc.exists ?
        {
          uid: driverDoc.id,
          name: driverDoc.data().name || "",
          phone: driverDoc.data().phone || "",
          vehicleNumber: driverDoc.data().vehicleNumber || "",
          vehicleModel: driverDoc.data().vehicleModel || "",
          rating: driverDoc.data().rating || 5,
        } :
        null;

    const payment = paymentDoc.exists ?
      {
        paymentId: paymentDoc.id,
        amount: paymentDoc.data().amount,
        currency: paymentDoc.data().currency,
        status: paymentDoc.data().status,
        provider: "SANDBOX",
        isSandbox: true,
        createdAt: paymentDoc.data().createdAt,
        completedAt: paymentDoc.data().completedAt,
      } :
      null;

    const ratings = ratingsSnap.docs.map((d) => ({
      ratingId: d.id,
      fromUid: d.data().fromUid,
      toUid: d.data().toUid,
      fromRole: d.data().fromRole,
      toRole: d.data().toRole,
      rating: d.data().rating,
      feedback: d.data().feedback,
      createdAt: d.data().createdAt,
    }));

    return res.status(200).json({
      success: true,
      ride: {
        rideId: rideDoc.id,
        pickup: rideData.pickup,
        destination: rideData.destination,
        status: rideData.status,
        requestedAt: rideData.requestedAt || rideData.createdAt,
        acceptedAt: rideData.acceptedAt,
        arrivingAt: rideData.arrivingAt,
        startedAt: rideData.startedAt,
        completedAt: rideData.completedAt,
        cancelledAt: rideData.cancelledAt,
        createdAt: rideData.createdAt,
      },
      passenger: passenger,
      driver: driver,
      payment: payment,
      ratings: ratings,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    return safeInternalError(
        res, "Failed to get admin ride details", "getAdminRideDetails", err);
  }
});
