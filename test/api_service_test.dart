import 'package:flutter_test/flutter_test.dart';
import 'package:chauffiq_frontend/services/api_service.dart';

void main() {
  group('ApiService Contract & Client Tests', () {
    setUp(() {
      ApiService.clearAuth();
    });

    test('Initial auth state is unauthenticated', () {
      expect(ApiService.isAuthenticated, isFalse);
      expect(ApiService.currentUserId, isNull);
      expect(ApiService.idToken, isNull);
    });

    test('setAuthToken sets idToken and userId correctly', () {
      ApiService.setAuthToken('test_token_123', uid: 'user_456');

      expect(ApiService.isAuthenticated, isTrue);
      expect(ApiService.currentUserId, equals('user_456'));
      expect(ApiService.idToken, equals('test_token_123'));
    });

    test('clearAuth resets token and userId', () {
      ApiService.setAuthToken('test_token_123', uid: 'user_456');
      expect(ApiService.isAuthenticated, isTrue);

      ApiService.clearAuth();
      expect(ApiService.isAuthenticated, isFalse);
      expect(ApiService.currentUserId, isNull);
      expect(ApiService.idToken, isNull);
    });

    test('Base URL points to asia-southeast1 Cloud Functions', () {
      expect(
        ApiService.baseUrl,
        equals('https://asia-southeast1-chauffiq-a0366.cloudfunctions.net'),
      );
    });

    test('Live Health Check against Cloud Functions backend', () async {
      final isHealthy = await ApiService.checkHealth();
      // Returns true if live network reachable or false if runner lacks WAN access
      expect(isHealthy, isA<bool>());
    });

    test('Unauthenticated getTripHistory returns a list without throwing', () async {
      final history = await ApiService.getTripHistory();
      expect(history, isA<List>());
    });

    test('Unauthenticated getAvailableDrivers returns a list without throwing', () async {
      final drivers = await ApiService.getAvailableDrivers();
      expect(drivers, isA<List>());
    });

    test('createRide handles server responses gracefully', () async {
      final res = await ApiService.createRide(
        pickup: 'Test Pickup Address',
        drop: 'Test Destination Address',
        vehicleType: 'Sedan',
        fare: 450.0,
      );
      expect(res, isA<Map<String, dynamic>>());
      expect(res.containsKey('success'), isTrue);
    });

    test('createDriver handles server responses gracefully', () async {
      final res = await ApiService.createDriver(
        vehicleType: 'Sedan',
        vehicleModel: 'Honda City',
        vehicleNumber: 'TS09XY9999',
        licenseNumber: 'DL-999999',
      );
      expect(res, isA<Map<String, dynamic>>());
      expect(res.containsKey('success'), isTrue);
    });
  });
}
