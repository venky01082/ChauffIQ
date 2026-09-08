/**
 * Admin API module (Operational Visibility & Admin Analytics)
 */
class AdminApi {
  /**
   * @param {HttpClient} http
   */
  constructor(http) {
    this.http = http;
  }

  /**
   * Retrieves aggregated operational metrics across the system
   * @return {Promise<{success: boolean, overview: object}>}
   */
  async getOverview() {
    return this.http.request({
      path: "/getAdminOverview",
      method: "GET",
      requiresAuth: true,
    });
  }

  /**
   * Retrieves paginated list of users
   * @param {object} [params]
   * @param {number} [params.limit=25]
   * @param {string} [params.role]
   * @param {string} [params.startAfter]
   * @param {string} [params.search]
   * @return {Promise<{success: boolean, users: Array, totalCount: number, hasMore: boolean}>}
   */
  async getUsers({limit, role, startAfter, search} = {}) {
    return this.http.request({
      path: "/getAdminUsers",
      method: "GET",
      params: {limit, role, startAfter, search},
      requiresAuth: true,
    });
  }

  /**
   * Retrieves paginated list of drivers
   * @param {object} [params]
   * @param {number} [params.limit=25]
   * @param {boolean|string} [params.isAvailable]
   * @param {string} [params.startAfter]
   * @return {Promise<{success: boolean, drivers: Array, totalCount: number, hasMore: boolean}>}
   */
  async getDrivers({limit, isAvailable, startAfter} = {}) {
    return this.http.request({
      path: "/getAdminDrivers",
      method: "GET",
      params: {limit, isAvailable, startAfter},
      requiresAuth: true,
    });
  }

  /**
   * Retrieves paginated list of rides
   * @param {object} [params]
   * @param {number} [params.limit=25]
   * @param {string} [params.status]
   * @param {string} [params.passengerId]
   * @param {string} [params.driverId]
   * @param {string} [params.startAfter]
   * @return {Promise<{success: boolean, rides: Array, totalCount: number, hasMore: boolean}>}
   */
  async getRides({limit, status, passengerId, driverId, startAfter} = {}) {
    return this.http.request({
      path: "/getAdminRides",
      method: "GET",
      params: {limit, status, passengerId, driverId, startAfter},
      requiresAuth: true,
    });
  }

  /**
   * Retrieves paginated sandbox payment transactions
   * @param {object} [params]
   * @param {number} [params.limit=25]
   * @param {string} [params.status]
   * @param {string} [params.startAfter]
   * @return {Promise<{success: boolean, payments: Array, totalCount: number, hasMore: boolean}>}
   */
  async getPayments({limit, status, startAfter} = {}) {
    return this.http.request({
      path: "/getAdminPayments",
      method: "GET",
      params: {limit, status, startAfter},
      requiresAuth: true,
    });
  }

  /**
   * Retrieves paginated ratings and feedback
   * @param {object} [params]
   * @param {number} [params.limit=25]
   * @param {string} [params.startAfter]
   * @return {Promise<{success: boolean, ratings: Array, totalCount: number, hasMore: boolean}>}
   */
  async getRatings({limit, startAfter} = {}) {
    return this.http.request({
      path: "/getAdminRatings",
      method: "GET",
      params: {limit, startAfter},
      requiresAuth: true,
    });
  }

  /**
   * Retrieves full operational details for an individual ride
   * @param {string} rideId
   * @return {Promise<{success: boolean, ride: object, passenger: object, driver: object, payment: object, ratings: Array}>}
   */
  async getRideDetails(rideId) {
    return this.http.request({
      path: "/getAdminRideDetails",
      method: "GET",
      params: {rideId},
      requiresAuth: true,
    });
  }

  /**
   * Developer-controlled admin bootstrap (server-side key required)
   * @param {object} [params]
   * @param {string} [params.bootstrapKey]
   * @return {Promise<{success: boolean, message: string, uid: string}>}
   */
  async bootstrapAdmin({bootstrapKey} = {}) {
    return this.http.request({
      path: "/bootstrapAdmin",
      method: "POST",
      headers: bootstrapKey ? {"x-admin-bootstrap-key": bootstrapKey} : {},
      body: {},
      requiresAuth: true,
    });
  }
}

module.exports = {
  AdminApi,
};
