/**
 * Tracking & Location API module
 */
class TrackingApi {
  /**
   * @param {HttpClient} http
   */
  constructor(http) {
    this.http = http;
  }

  /**
   * Updates real-time GPS coordinates for an active ride (assigned driver only)
   * @param {object} params
   * @param {string} params.rideId
   * @param {number} params.latitude
   * @param {number} params.longitude
   * @return {Promise<{success: boolean, message: string}>}
   */
  async updateDriverLocation({rideId, latitude, longitude}) {
    return this.http.request({
      path: "/updateDriverLocation",
      method: "POST",
      body: {rideId, latitude, longitude},
      requiresAuth: true,
    });
  }

  /**
   * Retrieves the current vehicle location for a ride
   * @param {string} rideId
   * @return {Promise<{success: boolean, location: object}>}
   */
  async getDriverLocation(rideId) {
    return this.http.request({
      path: "/getDriverLocation",
      method: "GET",
      params: {rideId},
      requiresAuth: true,
    });
  }
}

module.exports = {
  TrackingApi,
};
