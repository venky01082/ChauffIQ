import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Production Cloud Functions API Client for ChauffiQ
/// Connects to the 13 live Firebase Cloud Functions v2 deployed in asia-southeast1.
class ApiService {
  static const String baseUrl =
      "https://asia-southeast1-chauffiq-a0366.cloudfunctions.net";

  static String? _idToken;
  static String? _userId;

  static String? get currentUserId => _userId;
  static bool get isAuthenticated => _idToken != null;

  static void setAuthToken(String token, {String? uid}) {
    _idToken = token;
    _userId = uid;
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
        if (data["token"] != null) {
          setAuthToken(data["token"], uid: data["uid"]);
        }
        return {"success": true, "data": data};
      }
      return {"success": false, "error": data["error"] ?? "Registration failed"};
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
        setAuthToken(data["token"], uid: data["uid"]);
        return {"success": true, "data": data};
      }
      return {"success": false, "error": data["error"] ?? "Login failed"};
    } catch (e) {
      return {"success": false, "error": e.toString()};
    }
  }

  // ── 4. Driver Profile Creation (/createDriver) ────────────────────────────
  static Future<Map<String, dynamic>> createDriver({
    required String vehicleType,
    required String vehicleNumber,
    required String licenseNumber,
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$baseUrl/createDriver"),
        headers: _headers,
        body: jsonEncode({
          "vehicleType": vehicleType,
          "vehicleNumber": vehicleNumber,
          "licenseNumber": licenseNumber,
        }),
      );

      final data = jsonDecode(res.body);
      return {"success": res.statusCode == 200 || res.statusCode == 201, "data": data};
    } catch (e) {
      return {"success": false, "error": e.toString()};
    }
  }

  // ── 5. Query Available Drivers (/getAvailableDrivers) ─────────────────────
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

  // ── 6. Driver Availability Toggle (/updateDriverAvailability) ─────────────
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

  // ── 7. Ride Creation (/createRide) ────────────────────────────────────────
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
      return {"success": res.statusCode == 200 || res.statusCode == 201, "data": data};
    } catch (e) {
      return {"success": false, "error": e.toString()};
    }
  }

  // ── 8. Query Ride (/getRide) ──────────────────────────────────────────────
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

  // ── 9. Advance Ride State Machine (/updateRideStatus) ─────────────────────
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

  // ── 10. Broadcast Driver GPS Location (/updateDriverLocation) ─────────────
  static Future<bool> updateDriverLocation({
    required String rideId,
    required double latitude,
    required double longitude,
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$baseUrl/updateDriverLocation"),
        headers: _headers,
        body: jsonEncode({
          "rideId": rideId,
          "latitude": latitude,
          "longitude": longitude,
        }),
      );
      return res.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // ── 11. Read Driver Location (/getDriverLocation) ─────────────────────────
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

  // ── 12. Authorize Family Monitoring (/createFamilyMonitoring) ─────────────
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

  // ── 13. Create In-App Notification (/createNotification) ──────────────────
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
}
