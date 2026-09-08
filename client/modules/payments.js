/**
 * Payments API module (Sandbox/Test mode)
 */
class PaymentsApi {
  /**
   * @param {HttpClient} http
   */
  constructor(http) {
    this.http = http;
  }

  /**
   * Initiates a sandbox payment for an eligible completed ride
   * @param {object} params
   * @param {string} params.rideId
   * @return {Promise<{success: boolean, message: string, paymentId: string, payment: object}>}
   */
  async createPayment({rideId}) {
    return this.http.request({
      path: "/createPayment",
      method: "POST",
      body: {rideId},
      requiresAuth: true,
    });
  }

  /**
   * Retrieves payment details for a ride or payment ID
   * @param {object} [params]
   * @param {string} [params.paymentId]
   * @param {string} [params.rideId]
   * @return {Promise<{success: boolean, payment: object}>}
   */
  async getPayment({paymentId, rideId} = {}) {
    return this.http.request({
      path: "/getPayment",
      method: "GET",
      params: {paymentId, rideId},
      requiresAuth: true,
    });
  }

  /**
   * Simulates a sandbox payment outcome (SANDBOX TEST ONLY)
   * @param {object} params
   * @param {string} params.paymentId
   * @param {"SUCCESS"|"FAILURE"|"CANCEL"} params.outcome
   * @return {Promise<{success: boolean, message: string, payment: object}>}
   */
  async simulatePaymentResult({paymentId, outcome}) {
    return this.http.request({
      path: "/simulatePaymentResult",
      method: "POST",
      body: {paymentId, outcome},
      requiresAuth: true,
    });
  }
}

module.exports = {
  PaymentsApi,
};
