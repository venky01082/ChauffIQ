/**
 * Rides API module
 */
class RidesApi {
  /**
   * @param {HttpClient} http
   */
  constructor(http) {
    this.http = http;
  }

  /**
   * Books a new ride for the authenticated passenger
   * @param {object} params
   * @param {string} params.pickup
   * @param {string} params.destination
   * @return {Promise<{success: boolean, message: string, rideId: string}>}
   */
  async createRide({pickup, destination}) {
    return this.http.request({
      path: "/createRide",
      method: "POST",
      body: {pickup, destination},
      requiresAuth: true,
    });
  }

  /**
   * Updates the status of an existing ride
   * @param {object} params
   * @param {string} params.rideId
   * @param {"REQUESTED"|"ACCEPTED"|"ARRIVING"|"STARTED"|"COMPLETED"|"CANCELLED"} params.status
   * @return {Promise<{success: boolean, message: string}>}
   */
  async updateRideStatus({rideId, status}) {
    return this.http.request({
      path: "/updateRideStatus",
      method: "POST",
      body: {rideId, status},
      requiresAuth: true,
    });
  }

  /**
   * Retrieves full ride details
   * @param {string} rideId
   * @return {Promise<{success: boolean, ride: object}>}
   */
  async getRide(rideId) {
    return this.http.request({
      path: "/getRide",
      method: "GET",
      params: {rideId},
      requiresAuth: true,
    });
  }

  /**
   * Retrieves trip history for the authenticated user
   * @param {object} [params]
   * @param {"PASSENGER"|"DRIVER"|"FAMILY"|"ALL"} [params.role]
   * @param {"ALL"|"COMPLETED"|"CANCELLED"|"ACTIVE"} [params.status]
   * @param {number} [params.limit]
   * @return {Promise<{success: boolean, count: number, total: number, rides: Array<object>}>}
   */
  async getTripHistory(params = {}) {
    return this.http.request({
      path: "/getTripHistory",
      method: "GET",
      params,
      requiresAuth: true,
    });
  }

  /**
   * Submits a rating and optional feedback for a completed ride
   * @param {object} params
   * @param {string} params.rideId
   * @param {number} params.rating
   * @param {string} [params.feedback]
   * @return {Promise<{success: boolean, message: string, ratingId: string, rating: object}>}
   */
  async submitRating({rideId, rating, feedback} = {}) {
    return this.http.request({
      path: "/submitRating",
      method: "POST",
      body: {rideId, rating, feedback},
      requiresAuth: true,
    });
  }

  /**
   * Retrieves all ratings associated with a completed ride
   * @param {string} rideId
   * @return {Promise<{success: boolean, rideId: string, ratings: Array<object>}>}
   */
  async getRideRatings(rideId) {
    return this.http.request({
      path: "/getRideRatings",
      method: "GET",
      params: {rideId},
      requiresAuth: true,
    });
  }
}

module.exports = {
  RidesApi,
};
