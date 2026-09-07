import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:chauffiq_frontend/screens/wallet_screen.dart';
import 'package:chauffiq_frontend/screens/main_navigation_screen.dart';

void main() {
  testWidgets('WalletScreen renders balance, quick recharge, and transactions', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: WalletScreen()));

    // Verify balance card
    expect(find.text('AVAILABLE BALANCE'), findsOneWidget);
    expect(find.text('₹1450'), findsOneWidget);

    // Verify quick recharge pills
    expect(find.text('+ ₹500'), findsOneWidget);
    expect(find.text('+ ₹1000'), findsOneWidget);
    expect(find.text('+ ₹2000'), findsOneWidget);

    // Tap + ₹500
    await tester.tap(find.text('+ ₹500'));
    await tester.pump();

    // Verify updated balance
    expect(find.text('₹1950'), findsOneWidget);
  });

  testWidgets('MainNavigationScreen renders all 5 bottom navigation destinations', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: MainNavigationScreen()));
    await tester.pump(const Duration(milliseconds: 100));

    // Verify NavigationBar and destinations
    final navBar = find.byType(NavigationBar);
    expect(navBar, findsOneWidget);
    expect(find.descendant(of: navBar, matching: find.text('Home')), findsOneWidget);
    expect(find.descendant(of: navBar, matching: find.text('My Trips')), findsOneWidget);
    expect(find.descendant(of: navBar, matching: find.text('Driver Mode')), findsOneWidget);
    expect(find.descendant(of: navBar, matching: find.text('Wallet')), findsOneWidget);
    expect(find.descendant(of: navBar, matching: find.text('Profile')), findsOneWidget);

    // Switch to Wallet tab
    await tester.tap(find.descendant(of: navBar, matching: find.text('Wallet')));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('AVAILABLE BALANCE'), findsOneWidget);
  });
}
