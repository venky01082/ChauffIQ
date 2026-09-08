"use strict";

const authService = require("../services/authService");
const {checkRateLimit} = require("../middleware/rateLimitMiddleware");
const {verifyToken} = require("../middleware/authMiddleware");
const {isValidEmail} = require("../middleware/validationMiddleware");
const {safeInternalError} = require("../utils/helpers");

let webApiKeyParamRef = null;

/**
 * Injects webApiKey SecretParam reference.
 * @param {object} param
 */
function setWebApiKeyParam(param) {
  webApiKeyParamRef = param;
}

/**
 * POST /register
 */
async function register(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Only POST requests are allowed",
      });
    }

    const rateLimit = await checkRateLimit(req, "register", 25, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      res.setHeader("Retry-After", String(rateLimit.retryAfterSec));
      return res.status(429).json({
        success: false,
        message:
          "Too many registration attempts. Please try again in " +
          `${rateLimit.retryAfterSec} seconds.`,
      });
    }

    const body = req.body || {};
    const {email, password, name, phone, role} = body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Valid email address is required (max 254 characters)",
      });
    }

    if (typeof password !== "string" || password.length < 6 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must contain between 6 and 128 characters",
      });
    }

    if (typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must be a valid string up to 100 characters",
      });
    }

    const rawPhone = typeof phone === "string" ? phone.trim() : "";
    let validPhoneNumber = null;
    if (rawPhone.length > 0) {
      const E164_REGEX = /^\+[1-9]\d{1,14}$/;
      if (!E164_REGEX.test(rawPhone)) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number. Must be E.164 format (e.g. +919876543210)",
        });
      }
      validPhoneNumber = rawPhone;
    }

    const user = await authService.registerUser({
      email,
      password,
      name: name.trim(),
      phone: validPhoneNumber,
      role: role || "PASSENGER",
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    const errCode = error.code || (error.errorInfo && error.errorInfo.code);
    if (errCode === "auth/email-already-exists") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }
    if (errCode === "auth/invalid-phone-number") {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number. Must be in E.164 format (e.g. +919876543210)",
      });
    }
    return safeInternalError(res, "Registration failed", "register", error);
  }
}

/**
 * POST /login
 */
async function login(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Only POST requests are allowed",
    });
  }

  try {
    const rateLimit = await checkRateLimit(req, "login", 35, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      res.setHeader("Retry-After", String(rateLimit.retryAfterSec));
      return res.status(429).json({
        success: false,
        message:
          "Too many login attempts. Please try again in " +
          `${rateLimit.retryAfterSec} seconds.`,
      });
    }

    const body = req.body || {};
    const {email, password} = body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    let apiKey = null;
    try {
      if (webApiKeyParamRef && typeof webApiKeyParamRef.value === "function") {
        apiKey = webApiKeyParamRef.value();
      }
    } catch (_) {
      // Secret manager may not be active in unit test environment
    }
    if (!apiKey) {
      apiKey = process.env.WEB_API_KEY || null;
    }

    const result = await authService.loginUser({
      email,
      password,
      apiKey,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: result.user,
      idToken: result.idToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    if (error.status === 401) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        error: error.message,
      });
    }
    return safeInternalError(res, "Login failed", "login", error);
  }
}

/**
 * POST /syncUser
 */
async function syncUser(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Only POST requests are allowed",
    });
  }

  try {
    const decodedToken = req.user || (await verifyToken(req));
    const result = await authService.syncUserProfile(decodedToken.uid, {
      email: decodedToken.email,
      ...req.body,
    });

    return res.status(200).json({
      success: true,
      message: "User profile synchronized",
      user: result,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(res, "Failed to sync user profile", "syncUser", error);
  }
}

module.exports = {
  register,
  login,
  syncUser,
  setWebApiKeyParam,
};
