"use strict";

const {db, messaging} = require("../utils/firebase");
const {log} = require("../utils/logger");

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
    log.error("sendPushNotificationToUser", error.message, error);
    return {sent: 0, failed: 0};
  }
}

/**
 * Creates and persists an in-app notification record and pushes via FCM.
 * @param {string} recipientId - User UID
 * @param {object} notificationData - { title, body, data }
 * @return {Promise<object>}
 */
async function createNotification(recipientId, {title, body, data = {}}) {
  const notifRef = db.collection("notifications").doc();
  const notifData = {
    notificationId: notifRef.id,
    recipientId,
    title,
    body,
    data: data || {},
    read: false,
    createdAt: new Date().toISOString(),
  };

  await notifRef.set(notifData);
  const pushResult = await sendPushNotificationToUser(recipientId, {title, body, data});

  return {
    ...notifData,
    pushResult,
  };
}

/**
 * Registers an FCM token for a user.
 * @param {string} uid
 * @param {string} token
 * @param {string} [platform="web"]
 */
async function registerFcmToken(uid, token, platform = "web") {
  const tokenDocRef = db
      .collection("users")
      .doc(uid)
      .collection("fcmTokens")
      .doc(token);

  await tokenDocRef.set({
    token: token,
    platform: platform,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, {merge: true});

  return {registered: true, token};
}

/**
 * Removes an FCM token for a user.
 * @param {string} uid
 * @param {string} token
 */
async function unregisterFcmToken(uid, token) {
  await db
      .collection("users")
      .doc(uid)
      .collection("fcmTokens")
      .doc(token)
      .delete();

  return {unregistered: true, token};
}

module.exports = {
  sendPushNotificationToUser,
  createNotification,
  registerFcmToken,
  unregisterFcmToken,
};
