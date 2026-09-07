import 'package:flutter/material.dart';
import 'screens/splash_screen.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const ChauffiQApp());
}

class ChauffiQApp extends StatelessWidget {
  const ChauffiQApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'ChauffiQ',
      theme: AppTheme.lightTheme,
      home: const SplashScreen(),
    );
  }
}