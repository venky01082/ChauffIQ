"use strict";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

/**
 * Validates email format and length.
 * @param {string} email
 * @return {boolean}
 */
function isValidEmail(email) {
  return typeof email === "string" &&
    EMAIL_REGEX.test(email) &&
    email.length <= 254;
}

/**
 * Validates E.164 international phone format.
 * @param {string} phone
 * @return {boolean}
 */
function isValidPhone(phone) {
  return typeof phone === "string" && E164_REGEX.test(phone.trim());
}

/**
 * Validates latitude and longitude coordinates.
 * @param {number} lat
 * @param {number} lng
 * @return {boolean}
 */
function isValidCoordinates(lat, lng) {
  const nLat = Number(lat);
  const nLng = Number(lng);
  return (
    !isNaN(nLat) &&
    !isNaN(nLng) &&
    nLat >= -90 &&
    nLat <= 90 &&
    nLng >= -180 &&
    nLng <= 180
  );
}

/**
 * Sanitizes and bounds a pagination limit parameter.
 * @param {any} limitParam
 * @param {number} defaultLimit
 * @param {number} maxLimit
 * @return {number}
 */
function parseLimit(limitParam, defaultLimit = 25, maxLimit = 100) {
  const parsed = parseInt(limitParam, 10);
  if (isNaN(parsed) || parsed < 1) return defaultLimit;
  return Math.min(parsed, maxLimit);
}

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidCoordinates,
  parseLimit,
};
