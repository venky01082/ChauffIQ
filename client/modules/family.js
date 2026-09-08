/**
 * Family Monitoring API module
 */
class FamilyApi {
  /**
   * @param {HttpClient} http
   */
  constructor(http) {
    this.http = http;
  }

  /**
   * Authorizes a family member to monitor a passenger's active ride
   * @param {object} params
   * @param {string} params.rideId
   * @param {string} params.familyMemberId
   * @return {Promise<{success: boolean, message: string, monitoringId: string}>}
   */
  async createFamilyMonitoring({rideId, familyMemberId}) {
    return this.http.request({
      path: "/createFamilyMonitoring",
      method: "POST",
      body: {rideId, familyMemberId},
      requiresAuth: true,
    });
  }

  /**
   * Retrieves monitored rides history for the authorized family member
   * @param {object} [params]
   * @param {"ALL"|"COMPLETED"|"CANCELLED"|"ACTIVE"} [params.status]
   * @param {number} [params.limit]
   * @return {Promise<{success: boolean, count: number, total: number, rides: Array<object>}>}
   */
  async getFamilyRides(params = {}) {
    return this.http.request({
      path: "/getTripHistory",
      method: "GET",
      params: {...params, role: "FAMILY"},
      requiresAuth: true,
    });
  }
}

module.exports = {
  FamilyApi,
};
