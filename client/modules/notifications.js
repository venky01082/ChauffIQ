/**
 * Notifications API module
 */
class NotificationsApi {
  /**
   * @param {HttpClient} http
   */
  constructor(http) {
    this.http = http;
  }

  /**
   * Creates an in-app notification for the authenticated user
   * @param {object} params
   * @param {string} params.title
   * @param {string} params.message
   * @param {string} [params.type="GENERAL"]
   * @return {Promise<{success: boolean, message: string, notificationId: string}>}
   */
  async createNotification({title, message, type = "GENERAL"}) {
    return this.http.request({
      path: "/createNotification",
      method: "POST",
      body: {title, message, type},
      requiresAuth: true,
    });
  }

  /**
   * Registers an FCM push notification token for the authenticated user
   * @param {object} params
   * @param {string} params.token - FCM registration token
   * @param {object} [params.deviceInfo] - Optional device details
   * @return {Promise<{success: boolean, message: string, tokenId: string}>}
   */
  async registerFcmToken({token, deviceInfo = {}}) {
    return this.http.request({
      path: "/registerFcmToken",
      method: "POST",
      body: {token, deviceInfo},
      requiresAuth: true,
    });
  }

  /**
   * Unregisters an FCM push notification token
   * @param {object} params
   * @param {string} [params.token] - FCM registration token
   * @param {string} [params.tokenId] - FCM token identifier
   * @return {Promise<{success: boolean, message: string}>}
   */
  async unregisterFcmToken({token, tokenId} = {}) {
    return this.http.request({
      path: "/registerFcmToken",
      method: "DELETE",
      params: {token, tokenId},
      body: {token, tokenId},
      requiresAuth: true,
    });
  }
}

module.exports = {
  NotificationsApi,
};
