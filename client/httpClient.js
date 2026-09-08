const {ApiClientError} = require("./errors");
const {getBaseUrl} = require("./config");

/**
 * Core HTTP Client for ChauffIQ
 * Handles transport, query params, JSON payloads, and authorization headers.
 */
class HttpClient {
  /**
   * @param {object} options
   * @param {string} [options.baseUrl] - Base API URL
   * @param {TokenManager} [options.tokenManager] - Token manager instance
   */
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || getBaseUrl()).replace(/\/$/, "");
    this.tokenManager = options.tokenManager || null;
  }

  /**
   * Sends an HTTP request to the backend.
   * @param {object} config
   * @param {string} config.path - Relative path (e.g. "/getRide")
   * @param {string} [config.method="GET"] - HTTP method
   * @param {object} [config.params] - Query parameters
   * @param {object} [config.body] - JSON request payload
   * @param {boolean} [config.requiresAuth=true] - Whether to attach Bearer token
   * @return {Promise<object>} JSON response
   */
  async request({path, method = "GET", params = null, body = null, requiresAuth = true}) {
    let url = `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

    if (params && typeof params === "object") {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }
    }

    const headers = {
      "Accept": "application/json",
    };

    if (body !== null && (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE")) {
      headers["Content-Type"] = "application/json";
    }

    if (requiresAuth) {
      if (!this.tokenManager) {
        throw new ApiClientError(401, "Authentication required but no TokenManager is configured");
      }
      const token = await this.tokenManager.getToken();
      if (!token) {
        throw new ApiClientError(401, "Authentication required: No active session or ID token");
      }
      headers["Authorization"] = `Bearer ${token}`;
    }

    const fetchOptions = {
      method,
      headers,
    };

    if (body !== null) {
      fetchOptions.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (networkError) {
      throw new ApiClientError(0, `Network error: ${networkError.message}`);
    }

    let responseData = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        responseData = await response.json();
      } catch (parseError) {
        responseData = null;
      }
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const message =
        (responseData && typeof responseData === "object" && responseData.message) ||
        (responseData && typeof responseData === "object" && responseData.error) ||
        `Request failed with status ${response.status}`;
      throw new ApiClientError(response.status, message, responseData);
    }

    return responseData;
  }
}

module.exports = {
  HttpClient,
};
