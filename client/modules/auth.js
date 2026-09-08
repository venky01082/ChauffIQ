/**
 * Authentication & System API module
 */
class AuthApi {
  /**
   * @param {HttpClient} http
   * @param {TokenManager} tokenManager
   */
  constructor(http, tokenManager) {
    this.http = http;
    this.tokenManager = tokenManager;
  }

  /**
   * Backend health check
   * @return {Promise<{success: boolean, message: string}>}
   */
  async hello() {
    return this.http.request({
      path: "/hello",
      method: "GET",
      requiresAuth: false,
    });
  }

  /**
   * Registers a new user
   * @param {object} params
   * @param {string} params.email
   * @param {string} params.password
   * @param {string} params.name
   * @param {string} [params.phone]
   * @param {string} [params.role]
   * @return {Promise<object>}
   */
  async register({email, password, name, phone, role}) {
    return this.http.request({
      path: "/register",
      method: "POST",
      body: {email, password, name, phone, role},
      requiresAuth: false,
    });
  }

  /**
   * Logs in an existing user and stores the ID token in the TokenManager
   * @param {object} credentials
   * @param {string} credentials.email
   * @param {string} credentials.password
   * @param {boolean} [autoStoreToken=true] - Whether to store ID token in TokenManager
   * @return {Promise<object>}
   */
  async login({email, password}, autoStoreToken = true) {
    const response = await this.http.request({
      path: "/login",
      method: "POST",
      body: {email, password},
      requiresAuth: false,
    });

    if (autoStoreToken && response && response.idToken && this.tokenManager) {
      this.tokenManager.setToken(response.idToken);
    }

    return response;
  }

  /**
   * Directly sets the ID token in the TokenManager
   * (e.g. after successful Firebase Phone Authentication)
   * @param {string} token
   */
  setToken(token) {
    if (this.tokenManager) {
      this.tokenManager.setToken(token);
    }
  }

  /**
   * Synchronizes user profile with the backend using the verified token
   * @param {object} [profile]
   * @param {string} [profile.name]
   * @param {string} [profile.role]
   * @return {Promise<object>}
   */
  async syncUser(profile = {}) {
    return this.http.request({
      path: "/syncUser",
      method: "POST",
      body: profile,
      requiresAuth: true,
    });
  }

  /**
   * Logs out the current user by clearing the in-memory token
   */
  logout() {
    if (this.tokenManager) {
      this.tokenManager.clearToken();
    }
  }
}

module.exports = {
  AuthApi,
};
