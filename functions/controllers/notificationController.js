"use strict";

const crypto = require("crypto");
const {db} = require("../utils/firebase");
const {verifyToken} = require("../middleware/authMiddleware");
const {sendPushNotificationToUser} = require("../services/notificationService");
const {safeInternalError} = require("../utils/helpers");

/**
 * POST /createNotification
 */
async function createNotification(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Only POST requests are allowed",
    });
  }

  try {
    const decodedToken = req.user || (await verifyToken(req));
    const userId = decodedToken.uid;
    const body = req.body || {};
    const {title, message, type} = body;

    if (
      !title || !message ||
      typeof title !== "string" ||
      typeof message !== "string" ||
      title.trim().length === 0 ||
      message.trim().length === 0 ||
      title.length > 120 ||
      message.length > 500
    ) {
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
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(res, "Failed to create notification", "createNotification", error);
  }
}

/**
 * POST or DELETE /registerFcmToken
 */
async function registerFcmToken(req, res) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({
      success: false,
      message: "Only POST and DELETE requests are allowed",
    });
  }

  try {
    const decodedToken = req.user || (await verifyToken(req));
    const userId = decodedToken.uid;
    const body = req.body || {};
    const query = req.query || {};

    if (req.method === "POST") {
      const {token, deviceInfo} = body;

      if (!token || typeof token !== "string" || !token.trim() || token.length > 4096) {
        return res.status(400).json({
          success: false,
          message: "token is required and must be a valid string (max 4096)",
        });
      }

      const trimmedToken = token.trim();
      const tokenId = crypto.createHash("sha256").update(trimmedToken).digest("hex");
      const tokenRef = db.collection("users").doc(userId).collection("fcmTokens").doc(tokenId);

      const existingDoc = await tokenRef.get();
      const now = new Date().toISOString();

      const tokenData = {
        tokenId: tokenId,
        token: trimmedToken,
        userId: userId,
        deviceInfo: (deviceInfo && typeof deviceInfo === "object") ? deviceInfo : {},
        createdAt: existingDoc.exists ? (existingDoc.data().createdAt || now) : now,
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
        tokenId = crypto.createHash("sha256").update(token.trim()).digest("hex");
      }

      if (!tokenId) {
        return res.status(400).json({
          success: false,
          message: "token or tokenId is required to unregister",
        });
      }

      await db.collection("users").doc(userId).collection("fcmTokens").doc(tokenId).delete();

      return res.status(200).json({
        success: true,
        message: "FCM token unregistered successfully",
      });
    }
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(res, "Failed to process FCM token request", "registerFcmToken", error);
  }
}

module.exports = {
  createNotification,
  registerFcmToken,
};
