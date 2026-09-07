import 'package:flutter_test/flutter_test.dart';
import 'package:chauffiq_frontend/main.dart';
import 'package:chauffiq_frontend/data/driver_database.dart';

void main() {
  testWidgets('ChauffiQ app smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const ChauffiQApp());

    // Verify seed drivers exist
    expect(DriverDatabase.drivers.isNotEmpty, true);

    // Initial frame on splash screen renders Chauff + iQ branding
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.text('Chauff'), findsOneWidget);
    expect(find.text('iQ'), findsOneWidget);
    expect(find.text('Your Trusted Driver, Anytime'), findsOneWidget);

    // Complete splash timer and transitions to LoginScreen
    await tester.pump(const Duration(seconds: 4));
    await tester.pumpAndSettle();

    // Verify reached LoginScreen
    expect(find.text('Get Started'), findsOneWidget);
  });
}
