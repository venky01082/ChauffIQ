const {TokenManager} = require("./tokenManager");
const {HttpClient} = require("./httpClient");
const {ApiClientError} = require("./errors");
const {getBaseUrl, DEFAULT_BASE_URL} = require("./config");
const {AuthApi} = require("./modules/auth");
const {DriversApi} = require("./modules/drivers");
const {RidesApi} = require("./modules/rides");
const {TrackingApi} = require("./modules/tracking");
const {FamilyApi} = require("./modules/family");
const {NotificationsApi} = require("./modules/notifications");
const {PaymentsApi} = require("./modules/payments");
const {AdminApi} = require("./modules/admin");

/**
 * ChauffIQ Main API Client
 */
class ChauffIQClient {
  /**
   * @param {object} [options]
   * @param {string} [options.baseUrl] - Backend API base URL
   * @param {function} [options.tokenProvider] - Dynamic token callback
   */
  constructor(options = {}) {
    this.tokenManager = new TokenManager({
      tokenProvider: options.tokenProvider,
    });

    this.http = new HttpClient({
      baseUrl: options.baseUrl || getBaseUrl(),
      tokenManager: this.tokenManager,
    });

    // Domain Modules
    this.auth = new AuthApi(this.http, this.tokenManager);
    this.drivers = new DriversApi(this.http);
    this.rides = new RidesApi(this.http);
    this.tracking = new TrackingApi(this.http);
    this.family = new FamilyApi(this.http);
    this.notifications = new NotificationsApi(this.http);
    this.payments = new PaymentsApi(this.http);
    this.admin = new AdminApi(this.http);
  }

  /**
   * Manually sets the active Firebase ID token
   * @param {string} token
   */
  setToken(token) {
    this.tokenManager.setToken(token);
  }

  /**
   * Clears the active authentication session
   */
  clearToken() {
    this.tokenManager.clearToken();
  }
}

/**
 * Factory helper for initializing the client
 * @param {object} [options]
 * @return {ChauffIQClient}
 */
function createChauffIQClient(options = {}) {
  return new ChauffIQClient(options);
}

module.exports = {
  ChauffIQClient,
  createChauffIQClient,
  TokenManager,
  ApiClientError,
  DEFAULT_BASE_URL,
  getBaseUrl,
};
