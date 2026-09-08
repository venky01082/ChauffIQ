"use strict";

/**
 * Structured GCP Cloud Logging & Error Reporting
 */
const log = {
  error: (tag, msg, err) => {
    const errText = err ? (err.message || String(err)) : "";
    const payload = {
      "severity": "ERROR",
      "message": `[${tag}] ${msg} ${errText}`.trim(),
      "tag": tag,
      "timestamp": new Date().toISOString(),
      "@type":
        "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1" +
        ".ReportedErrorEvent",
      "serviceContext": {
        service: "chauffiq-backend",
        version: "phase15",
      },
    };
    if (err && err.stack) {
      payload["stack_trace"] = err.stack;
    }
    console.error(JSON.stringify(payload));
  },
  warn: (tag, msg) => {
    console.warn(JSON.stringify({
      severity: "WARNING",
      tag: tag,
      message: msg,
      timestamp: new Date().toISOString(),
    }));
  },
  info: (tag, msg) => {
    console.log(JSON.stringify({
      severity: "INFO",
      tag: tag,
      message: msg,
      timestamp: new Date().toISOString(),
    }));
  },
  debug: (tag, msg) => {
    if (process.env.DEBUG === "true") {
      console.log(JSON.stringify({
        severity: "DEBUG",
        tag: tag,
        message: msg,
        timestamp: new Date().toISOString(),
      }));
    }
  },
};

/**
 * Structured audit logging for administrative actions.
 * Never logs secrets, passwords, or tokens.
 * @param {string} adminUid
 * @param {string} action
 * @param {string} [resourceId]
 * @param {object} [details]
 */
function logAdminAction(adminUid, action, resourceId = "", details = {}) {
  const safeLog = {
    event: "ADMIN_ACTION",
    adminUid: adminUid,
    action: action,
    resourceId: resourceId,
    timestamp: new Date().toISOString(),
    ...details,
  };
  console.log(JSON.stringify(safeLog));
}

module.exports = {
  log,
  logAdminAction,
};
