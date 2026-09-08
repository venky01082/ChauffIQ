"use strict";

const {initializeApp, getApps} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore, FieldValue, Timestamp} = require("firebase-admin/firestore");
const {getMessaging} = require("firebase-admin/messaging");

if (getApps().length === 0) {
  initializeApp();
}

const auth = getAuth();
const db = getFirestore();
const messaging = getMessaging();

module.exports = {
  auth,
  db,
  messaging,
  FieldValue,
  Timestamp,
};
