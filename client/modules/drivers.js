/**
 * Driver API module
 */
class DriversApi {
  /**
   * @param {HttpClient} http
   */
  constructor(http) {
    this.http = http;
  }

  /**
   * Creates a driver profile for the authenticated caller
   * @param {object} profile
   * @param {string} profile.name
   * @param {string} profile.phone
   * @param {string} profile.vehicleNumber
   * @param {string} [profile.vehicleModel]
   * @param {number} [profile.rating]
   * @return {Promise<object>}
   */
  async createDriver({name, phone, vehicleNumber, vehicleModel, rating}) {
    return this.http.request({
      path: "/createDriver",
      method: "POST",
      body: {name, phone, vehicleNumber, vehicleModel, rating},
      requiresAuth: true,
    });
  }

  /**
   * Retrieves all currently available and online drivers
   * @return {Promise<{success: boolean, count: number, drivers: Array}>}
   */
  async getAvailableDrivers() {
    return this.http.request({
      path: "/getAvailableDrivers",
      method: "GET",
      requiresAuth: true,
    });
  }

  /**
   * Updates availability and online status for the authenticated driver
   * @param {object} status
   * @param {boolean} [status.isAvailable]
   * @param {boolean} [status.isOnline]
   * @return {Promise<{success: boolean, message: string}>}
   */
  async updateDriverAvailability({isAvailable, isOnline}) {
    return this.http.request({
      path: "/updateDriverAvailability",
      method: "POST",
      body: {isAvailable, isOnline},
      requiresAuth: true,
    });
  }
}

module.exports = {
  DriversApi,
};
