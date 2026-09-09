/**
 * ChauffIQ Frontend Client Configuration
 *
 * Configurable backend base URL for local development emulator
 * and production deployments.
 */

const DEFAULT_BASE_URL =
  "https://asia-southeast1-chauffiq-a0366.cloudfunctions.net";

/**
 * Resolves the backend base URL.
 * Checks environment variable process.env.CHAUFFIQ_API_URL or window.__CHAUFFIQ_API_URL__
 * falls back to local emulator URL.
 * @return {string}
 */
function getBaseUrl() {
  if (typeof process !== "undefined" && process.env) {
    if (process.env.CHAUFFIQ_API_URL) {
      return process.env.CHAUFFIQ_API_URL;
    }
    if (process.env.VITE_CHAUFFIQ_API_URL) {
      return process.env.VITE_CHAUFFIQ_API_URL;
    }
  }
  if (typeof window !== "undefined" && window.__CHAUFFIQ_API_URL__) {
    return window.__CHAUFFIQ_API_URL__;
  }
  return DEFAULT_BASE_URL;
}

module.exports = {
  DEFAULT_BASE_URL,
  getBaseUrl,
};
