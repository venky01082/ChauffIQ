/**
 * API Client Error class
 */
class ApiClientError extends Error {
  /**
   * @param {number} status - HTTP status code
   * @param {string} message - Error message
   * @param {object} [data] - Raw error response data
   */
  constructor(status, message, data = null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.data = data;
  }
}

module.exports = {
  ApiClientError,
};
