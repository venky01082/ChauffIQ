import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Production Cloud Functions API Client for ChauffiQ
/// Connects to the live Firebase Cloud Functions v2 backend deployed in asia-southeast1.
class ApiService {
  static const String baseUrl =
      "https://asia-southeast1-chauffiq-a0366.cloudfunctions.net";

  static String? _idToken;
  static String? _userId;

  static String? get currentUserId => _userId;
  static bool get isAuthenticated => _idToken != null;
  static String? get idToken => _idToken;

  static void setAuthToken(String token, {String? uid}) {
    _idToken = token;
    _userId = uid;
  }

  static void clearAuth() {
    _idToken = null;
    _userId = null;
  }

  static Map<String, String> get _headers => {
        "Content-Type": "application/json",
        if (_idToken != null) "Authorization": "Bearer $_idToken",
      };

  // ── 1. Health Check (/hello) ──────────────────────────────────────────────
  static Future<bool> checkHealth() async {
    try {
      final res = await http.get(Uri.parse("$baseUrl/hello"));
      return res.statusCode == 200;
    } catch (e) {
      debugPrint("Health check error: $e");
      return false;
    }
  }

  // ── 2. User Registration (/register) ─────────────────────────────────────
  static Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    String? phone,
    String role = "passenger",
  }) async {
    try {
      final Map<String, dynamic> payload = {
        "name": name,
        "email": email,
        "password": password,
        "role": role,
      };
      if (phone != null && phone.isNotEmpty) {
        payload["phone"] = phone;
      }

      final res = await http.post(
        Uri.parse("$baseUrl/register"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode(payload),
      );

      final data = jsonDecode(res.body);
      if (res.statusCode == 201 || res.statusCode == 200) {
        final token = data["idToken"] ?? data["token"];
        final uid = (data["user"] is Map ? data["user"]["uid"] : null) ?? data["uid"];
        if (token != null) {
          setAuthToken(token.toString(), uid: uid?.toString());
        }
        return {"success": true, "data": data};
      }
      return {
        "success": false,
        "error": data["message"] ?? data["error"] ?? "Registration failed",
      };
    } catch (e) {
      return {"success": false, "error": e.toString()};
    }
  }

  // ── 3. User Login (/login) ────────────────────────────────────────────────
  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$baseUrl/login"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"email": email, "password": password}),
      );

      final data = jsonDecode(res.body);
      if (res.statusCode == 200) {
        final token = data["idToken"] ?? data["token"];
        final uid = (data["user"] is Map ? data["user"]["uid"] : null) ?? data["uid"];
        if (token != null) {
          setAuthToken(token.toString(), uid: uid?.toString());
        }
        return {"success": true, "data": data};
      }

      // Resilient fallback to Firebase Identity Toolkit if /login returns configuration error
      try {
        const apiKey = "AIzaSyCj7w7JAlJOSRlCIP_6XYLxhPCOtXhEVzM";
        final idRes = await http.post(
          Uri.parse(
              "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$apiKey"),
          headers: {"Content-Type": "application/json"},
          body: jsonEncode({
            "email": email,
            "password": password,
            "returnSecureToken": true,
          }),
        );
        if (idRes.statusCode == 200) {
          final idData = jsonDecode(idRes.body);
          final idToken = idData["idToken"];
          final localId = idData["localId"];
          if (idToken != null) {
            setAuthToken(idToken.toString(), uid: localId?.toString());
            await syncUser(name: idData["displayName"]);
            return {
              "success": true,
              "data": {
                "idToken": idToken,
                "user": {"uid": localId, "email": email}
              }
            };
          }
        }
      } catch (_) {}

      return {
        "success": false,
        "error": data["message"] ?? data["error"] ?? "Login failed",
      };
    } catch (e) {
      return {"success": false, "error": e.toString()};
    }
  }

  // ── 4. Sync User Profile (/syncUser) ──────────────────────────────────────
  static Future<Map<String, dynamic>> syncUser({
    String? name,
    String? phone,
    String? role,
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$baseUrl/syncUser"),
        headers: _headers,
        body: jsonEncode({
          if (name != null) "name": name,
          if (phone != null) "phone": phone,
          if (role != null) "role": role,
        }),
      );

      final data = jsonDecode(res.body);
      return {
        "success": res.statusCode == 200 || res.statusCode == 201,
        "data": data,
      };
    } catch (e) {
      return {"success": false, "error": e.toString()};
    }
  }

  // ── 5. Driver Profile Creation (/createDriver) ────────────────────────────
  static Future<Map<String, dynamic>> createDriver({
    required String vehicleType,
    required String vehicleNumber,
    String? vehicleModel,
    required String licenseNumber,
    String? name,
    String? phone,
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$baseUrl/createDriver"),
        headers: _headers,
        body: jsonEncode({
          "name": (name != null && name.isNotEmpty) ? name : "Professional Driver",
          "phone": (phone != null && phone.isNotEmpty) ? phone : "+919876543210",
          "vehicleType": vehicleType,
          "vehicleModel": vehicleModel ?? vehicleType,
          "vehicleNumber": vehicleNumber,
          "licenseNumber": licenseNumber,
        }),
      );

      final data = jsonDecode(res.body);
      return {
        "success": res.statusCode == 200 || res.statusCode == 201,
        "data": data,
        "error": data is Map ? (data["message"] ?? data["error"]) : null,
      };
    } catch (e) {
      return {"success": false, "error": e.toString()};
    }
  }

  // ── 6. Query Available Drivers (/getAvailableDrivers) ─────────────────────
  static Future<List<dynamic>> getAvailableDrivers() async {
    try {
      final res = await http.get(
        Uri.parse("$baseUrl/getAvailableDrivers"),
        headers: _headers,
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is List) return data;
        if (data is Map && data["drivers"] is List) return data["drivers"];
      }
      return [];
    } catch (e) {
      debugPrint("getAvailableDrivers error: $e");
      return [];
    }
  }

  // ── 7. Driver Availability Toggle (/updateDriverAvailability) ─────────────
  static Future<bool> updateDriverAvailability(bool isAvailable) async {
    try {
      final res = await http.post(
        Uri.parse("$baseUrl/updateDriverAvailability"),
        headers: _headers,
        body: jsonEncode({"isAvailable": isAvailable}),
      );
      return res.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // ── 8. Ride Creation (/createRide) ────────────────────────────────────────
  static Future<Map<String, dynamic>> createRide({
    required String pickup,
    required String drop,
    required String vehicleType,
    required double fare,
    String? driverId,
  }) async {
    try {
      final Map<String, dynamic> payload = {
        "pickup": pickup,
        "destination": drop,
        "drop": drop,
        "vehicleType": vehicleType,
        "fare": fare,
      };
      if (driverId != null && driverId.isNotEmpty) {
        payload["driverId"] = driverId;
      }

      final res = await http.post(
        Uri.parse("$baseUrl/createRide"),
        headers: _headers,
        body: jsonEncode(payload),
      );

      final data = jsonDecode(res.body);
      return {
        "success": res.statusCode == 200 || res.statusCode == 201,
        "data": data,
        "rideId": data is Map ? (data["rideId"] ?? (data["ride"] is Map ? data["ride"]["rideId"] : null)) : null,
        "error": data is Map ? (data["message"] ?? data["error"]) : null,
      };
    } catch (e) {
      return {"success": false, "error": e.toString()};
    }
  }

  // ── 9. Query Ride (/getRide) ──────────────────────────────────────────────
  static Future<Map<String, dynamic>?> getRide(String rideId) async {
    try {
      final res = await http.get(
        Uri.parse("$baseUrl/getRide?rideId=$rideId"),
        headers: _headers,
      );

      if (res.statusCode == 200) {
        return jsonDecode(res.body) as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // ── 10. Advance Ride State Machine (/updateRideStatus) ────────────────────
  static Future<bool> updateRideStatus({
    required String rideId,
    required String status, // REQUESTED -> ACCEPTED -> ARRIVING -> STARTED -> COMPLETED
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$baseUrl/updateRideStatus"),
        headers: _headers,
        body: jsonEncode({"rideId": rideId, "status": status}),
      );
      return res.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // ── 11. Broadcast Driver GPS Location (/updateDriverLocation) ────────────
  static Future<bool> updateDriverLocation({
    required String rideId,
    required double latitude,
    required double longitude,
    double? heading,
    double? speed,
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$baseUrl/updateDriverLocation"),
        headers: _headers,
        body: jsonEncode({
          "rideId": rideId,
          "latitude": latitude,
          "longitude": longitude,
          if (heading != null) "heading": heading,
          if (speed != null) "speed": speed,
        }),
      );
      return res.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // ── 12. Read Driver Location (/getDriverLocation) ────────────────────────
  static Future<Map<String, dynamic>?> getDriverLocation(String rideId) async {
    try {
      final res = await http.get(
        Uri.parse("$baseUrl/getDriverLocation?rideId=$rideId"),
        headers: _headers,
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        if (data["location"] is Map) {
          final loc = Map<String, dynamic>.from(data["location"] as Map);
          return {...data, ...loc};
        }
        return data;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // ── 13. Authorize Family Monitoring (/createFamilyMonitoring) ────────────
  static Future<bool> createFamilyMonitoring({
    required String rideId,
    required String familyMemberId,
    required String relationship,
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$baseUrl/createFamilyMonitoring"),
        headers: _headers,
        body: jsonEncode({
          "rideId": rideId,
          "familyMemberId": familyMemberId,
          "relationship": relationship,
        }),
      );
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (e) {
      return false;
    }
  }

  // ── 14. Create In-App Notification (/createNotification) ─────────────────
  static Future<bool> createNotification({
    required String recipientUid,
    required String title,
    required String message,
    String category = "ride_update",
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$baseUrl/createNotification"),
        headers: _headers,
        body: jsonEncode({
          "recipientUid": recipientUid,
          "title": title,
          "message": message,
          "category": category,
        }),
      );
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (e) {
      return false;
    }
  }

  // ── 15. Query Trip History (/getTripHistory) ─────────────────────────────
  static Future<List<dynamic>> getTripHistory() async {
    try {
      final res = await http.get(
        Uri.parse("$baseUrl/getTripHistory"),
        headers: _headers,
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is List) return data;
        if (data is Map && data["rides"] is List) return data["rides"];
        if (data is Map && data["trips"] is List) return data["trips"];
        if (data is Map && data["history"] is List) return data["history"];
      }
      return [];
    } catch (e) {
      debugPrint("getTripHistory error: $e");
      return [];
    }
  }

  // ── 16. Submit Rating & Review (/submitRating) ───────────────────────────
  static Future<Map<String, dynamic>> submitRating({
    required String rideId,
    required int rating,
    String? comment,
    String? feedback,
  }) async {
    try {
      final cleanFeedback = feedback ?? comment ?? "";
      final res = await http.post(
        Uri.parse("$baseUrl/submitRating"),
        headers: _headers,
        body: jsonEncode({
          "rideId": rideId,
          "rating": rating,
          "feedback": cleanFeedback,
          if (comment != null) "comment": comment,
        }),
      );

      final data = jsonDecode(res.body);
      return {
        "success": res.statusCode == 200 || res.statusCode == 201,
        "data": data,
      };
    } catch (e) {
      return {"success": false, "error": e.toString()};
    }
  }

  // ── 17. Query Ride Ratings (/getRideRatings) ──────────────────────────────
  static Future<Map<String, dynamic>?> getRideRatings(String rideId) async {
    try {
      final res = await http.get(
        Uri.parse("$baseUrl/getRideRatings?rideId=$rideId"),
        headers: _headers,
      );

      if (res.statusCode == 200) {
        return jsonDecode(res.body) as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // ── 18. Process Ride Payment (/createPayment) ─────────────────────────────
  static Future<Map<String, dynamic>> createPayment({
    required String rideId,
    double? amount,
    String paymentMethod = "CARD",
  }) async {
    try {
      final Map<String, dynamic> payload = {
        "rideId": rideId,
        "paymentMethod": paymentMethod,
      };
      if (amount != null) payload["amount"] = amount;

      final res = await http.post(
        Uri.parse("$baseUrl/createPayment"),
        headers: _headers,
        body: jsonEncode(payload),
      );

      final data = jsonDecode(res.body);
      return {
        "success": res.statusCode == 200 || res.statusCode == 201,
        "data": data,
      };
    } catch (e) {
      return {"success": false, "error": e.toString()};
    }
  }

  // ── 19. Payment Simulation Result (/simulatePaymentResult) ────────────────
  static Future<Map<String, dynamic>> simulatePaymentResult({
    required String paymentId,
    String outcome = "SUCCESS",
    String? status,
  }) async {
    try {
      final validOutcome = (outcome == "COMPLETED" || outcome == "SUCCESS") ? "SUCCESS" : outcome;
      final res = await http.post(
        Uri.parse("$baseUrl/simulatePaymentResult"),
        headers: _headers,
        body: jsonEncode({
          "paymentId": paymentId,
          "outcome": validOutcome,
          "status": status ?? validOutcome,
        }),
      );

      final data = jsonDecode(res.body);
      return {
        "success": res.statusCode == 200,
        "data": data,
      };
    } catch (e) {
      return {"success": false, "error": e.toString()};
    }
  }

  // ── 20. FCM Token Registration (/registerFcmToken) ───────────────────────
  static Future<bool> registerFcmToken({
    required String token,
    Map<String, dynamic>? deviceInfo,
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$baseUrl/registerFcmToken"),
        headers: _headers,
        body: jsonEncode({
          "token": token,
          if (deviceInfo != null) "deviceInfo": deviceInfo,
        }),
      );
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (e) {
      return false;
    }
  }

  // ── 21. Admin Dashboard Overview (/getAdminOverview) ─────────────────────
  static Future<Map<String, dynamic>?> getAdminOverview() async {
    try {
      final res = await http.get(
        Uri.parse("$baseUrl/getAdminOverview"),
        headers: _headers,
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is Map<String, dynamic>) return data;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // ── 22. Admin Query Users (/getAdminUsers) ────────────────────────────────
  static Future<List<dynamic>> getAdminUsers({
    int limit = 25,
    String? role,
    String? search,
  }) async {
    try {
      final queryParams = [
        "limit=$limit",
        if (role != null) "role=$role",
        if (search != null) "search=$search",
      ].join("&");
      final res = await http.get(
        Uri.parse("$baseUrl/getAdminUsers?$queryParams"),
        headers: _headers,
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is Map && data["users"] is List) return data["users"];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // ── 23. Admin Query Drivers (/getAdminDrivers) ────────────────────────────
  static Future<List<dynamic>> getAdminDrivers({
    int limit = 25,
    bool? isAvailable,
  }) async {
    try {
      final queryParams = [
        "limit=$limit",
        if (isAvailable != null) "isAvailable=$isAvailable",
      ].join("&");
      final res = await http.get(
        Uri.parse("$baseUrl/getAdminDrivers?$queryParams"),
        headers: _headers,
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is Map && data["drivers"] is List) return data["drivers"];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // ── 24. Admin Query Rides (/getAdminRides) ────────────────────────────────
  static Future<List<dynamic>> getAdminRides({
    int limit = 25,
    String? status,
  }) async {
    try {
      final queryParams = [
        "limit=$limit",
        if (status != null) "status=$status",
      ].join("&");
      final res = await http.get(
        Uri.parse("$baseUrl/getAdminRides?$queryParams"),
        headers: _headers,
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is Map && data["rides"] is List) return data["rides"];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // ── 25. Admin Query Payments (/getAdminPayments) ──────────────────────────
  static Future<List<dynamic>> getAdminPayments({
    int limit = 25,
    String? status,
  }) async {
    try {
      final queryParams = [
        "limit=$limit",
        if (status != null) "status=$status",
      ].join("&");
      final res = await http.get(
        Uri.parse("$baseUrl/getAdminPayments?$queryParams"),
        headers: _headers,
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is Map && data["payments"] is List) return data["payments"];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // ── 26. Admin Query Ratings (/getAdminRatings) ────────────────────────────
  static Future<List<dynamic>> getAdminRatings({int limit = 25}) async {
    try {
      final res = await http.get(
        Uri.parse("$baseUrl/getAdminRatings?limit=$limit"),
        headers: _headers,
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is Map && data["ratings"] is List) return data["ratings"];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // ── 27. Admin Ride Details (/getAdminRideDetails) ─────────────────────────
  static Future<Map<String, dynamic>?> getAdminRideDetails(String rideId) async {
    try {
      final res = await http.get(
        Uri.parse("$baseUrl/getAdminRideDetails?rideId=$rideId"),
        headers: _headers,
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is Map<String, dynamic>) return data;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
