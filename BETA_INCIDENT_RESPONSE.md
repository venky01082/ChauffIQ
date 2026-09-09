# CHAUFFIQ BETA INCIDENT RESPONSE PROTOCOL

**Platform:** ChauffIQ Mobility Platform  
**Target Environment:** Production (`chauffiq-a0366` / `asia-southeast1`)  
**Scope:** Beta Release Incident Triage, Containment & Resolution  

---

## 1. INCIDENT SEVERITY CLASSIFICATION

| Severity | Definition | Examples | SLA / Response Time |
| :--- | :--- | :--- | :--- |
| **Critical (P1)** | Complete system outage, data loss, total authentication failure, or security breach. | All users blocked from logging in; Cloud Functions returning 500 across all routes; Firestore rules allowing unauthorized reads. | **Immediate (< 15 mins)** |
| **High (P2)** | Core workflow blocked for all users with no workaround. | Ride creation failing with 400/500; GPS coordinates not persisting; ride state machine deadlock. | **< 1 hour** |
| **Medium (P3)** | Feature degraded but functional workaround exists. | Rating submission failing for specific character counts; family monitoring lag; cosmetic layout overlap. | **< 6 hours** |
| **Low (P4)** | Minor cosmetic flaw, minor text typo, or non-blocking enhancement request. | Misaligned badge on mobile viewport; minor spelling error. | **Next planned build** |

---

## 2. IMMEDIATE RESPONSE WORKFLOW

```
   [INCIDENT REPORTED]
           │
           ▼
   1. Assess Severity (P1 / P2 / P3 / P4)
           │
           ├──────────────────────────────┐
           ▼ (If P1 Critical)             ▼ (If P2 - P4)
   2A. Halt Active Beta Testing    2B. Reproduce in Local Environment
   Notify Beta User Cohort                  │
           │                                ▼
           ▼                        3. Locate Root Cause in Logs
   3A. Evaluate Rollback Decision           │
   (Hosting / Functions Rollback)           ▼
           │                        4. Implement Isolated Patch
           ▼                                │
   4A. Execute Rollback                     ▼
           │                        5. Run 100% Regression Tests
           └──────────────────────────────┬─┘
                                          │
                                          ▼
                                6. Deploy Hotfix & Re-verify
                                          │
                                          ▼
                                7. Post-Mortem Documentation
```

---

## 3. EVIDENCE COLLECTION PROCEDURE

When an incident occurs:
1. **Cloud Logging Inspection:**
   - Open Google Cloud Console -> **Logs Explorer** (`asia-southeast1`).
   - Query filter:
     ```text
     resource.type="cloud_function"
     severity>=WARNING
     ```
2. **Firestore State Inspection:**
   - Check the specific document (`rides/{rideId}`, `payments/{paymentId}`, `users/{uid}`) in Firebase Console.
   - Record exact document timestamps and status fields.
3. **Client Network & Console Capture:**
   - Retrieve request URL, method, status code, and response body from user DevTools Network or screenshot.

---

## 4. ROLLBACK DECISION MATRIX

| Scenario | Rollback Action | Execution Command |
| :--- | :--- | :--- |
| **Frontend UI Broken / White Screen** | Revert to previous Firebase Hosting version | `npx firebase-tools hosting:rollback --project chauffiq-a0366` |
| **Backend State Machine Bug** | Revert Cloud Functions to previous Git tag | `git checkout <previous-tag>`<br>`npx firebase-tools deploy --only functions --project chauffiq-a0366` |
| **Security Rules Regression** | Immediately re-apply baseline rules | `npx firebase-tools deploy --only firestore:rules --project chauffiq-a0366` |

---

## 5. RESOLUTION & POST-MORTEM

1. **Root Cause Analysis:** Document exact cause in an incident log.
2. **Test Regression Suite:** Add an automated unit or integration test case in `test_frontend_backend_integration.js` to ensure the issue can never re-occur.
3. **Notify Users:** Inform the beta tester group that the issue is resolved and testing may resume.
