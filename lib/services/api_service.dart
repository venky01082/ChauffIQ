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
        return jsonDecode(res.body) as Map<String, dynamic>;
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
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$baseUrl/submitRating"),
        headers: _headers,
        body: jsonEncode({
          "rideId": rideId,
          "rating": rating,
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
    required double amount,
    String paymentMethod = "CARD",
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$baseUrl/createPayment"),
        headers: _headers,
        body: jsonEncode({
          "rideId": rideId,
          "amount": amount,
          "paymentMethod": paymentMethod,
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

  // ── 19. Payment Simulation Result (/simulatePaymentResult) ────────────────
  static Future<Map<String, dynamic>> simulatePaymentResult({
    required String paymentId,
    String status = "COMPLETED",
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$baseUrl/simulatePaymentResult"),
        headers: _headers,
        body: jsonEncode({
          "paymentId": paymentId,
          "status": status,
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
}
