/**
 * Token Manager for ChauffIQ Client
 *
 * Handles storage and retrieval of Firebase ID tokens.
 * Can be hooked into Firebase Client Auth (e.g. auth.currentUser.getIdToken())
 * or populated via the login API response.
 *
 * SECURITY: Never logs or serializes sensitive credentials.
 */

class TokenManager {
  /**
   * @param {object} [options]
   * @param {function} [options.tokenProvider] - Optional async callback returning current ID token
   */
  constructor(options = {}) {
    this._token = null;
    this._tokenProvider = options.tokenProvider || null;
  }

  /**
   * Sets the active Firebase ID token (in memory).
   * @param {string} token
   */
  setToken(token) {
    if (typeof token !== "string" || !token.trim()) {
      throw new Error("Token must be a non-empty string");
    }
    this._token = token.trim();
  }

  /**
   * Clears the active token on logout.
   */
  clearToken() {
    this._token = null;
  }

  /**
   * Retrieves the current Firebase ID token.
   * If a dynamic tokenProvider was supplied (e.g. from Firebase Web/Mobile SDK),
   * it invokes that provider to ensure fresh tokens.
   * @return {Promise<string|null>}
   */
  async getToken() {
    if (typeof this._tokenProvider === "function") {
      try {
        const dynamicToken = await this._tokenProvider();
        if (dynamicToken) {
          return dynamicToken;
        }
      } catch (err) {
        // Fall back to stored in-memory token
      }
    }
    return this._token;
  }

  /**
   * Registers a dynamic token provider (e.g. () => auth.currentUser.getIdToken())
   * @param {function} provider
   */
  setTokenProvider(provider) {
    if (typeof provider !== "function") {
      throw new Error("Token provider must be a function");
    }
    this._tokenProvider = provider;
  }

  /**
   * Safe string representation that prevents token leakage in logs.
   * @return {string}
   */
  toString() {
    return "[TokenManager: Token " + (this._token ? "Set" : "Empty") + "]";
  }
}

module.exports = {
  TokenManager,
};
