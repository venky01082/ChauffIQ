import 'package:flutter/material.dart';
import '../models/driver.dart';
import 'ride_tracking_screen.dart';

class BookingSuccessScreen extends StatelessWidget {
  final Driver? driver;
  final String userName;
  final String pickup;
  final String drop;
  final String vehicle;

  const BookingSuccessScreen({
    super.key,
    this.driver,
    this.userName = "",
    this.pickup = "",
    this.drop = "",
    this.vehicle = "",
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.green.shade50,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Animated success icon
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.green.shade100,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_circle_rounded,
                    color: Colors.green,
                    size: 90,
                  ),
                ),

                const SizedBox(height: 24),

                const Text(
                  "Booking Confirmed!",
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),

                const SizedBox(height: 10),

                Text(
                  driver != null
                      ? "${driver!.name} is assigned and on the way."
                      : "Your driver is on the way.",
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16, color: Colors.grey.shade700),
                ),

                const SizedBox(height: 36),

                // Primary Button: Track Ride Live
                if (driver != null)
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: () {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(
                            builder: (_) => RideTrackingScreen(
                              driver: driver!,
                              userName: userName,
                              pickup: pickup,
                              drop: drop,
                              vehicle: vehicle,
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.navigation_outlined),
                      label: const Text(
                        "TRACK RIDE LIVE",
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),

                const SizedBox(height: 14),

                // Secondary Button: Back to Home
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.grey),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: () {
                      Navigator.popUntil(
                        context,
                        (route) => route.isFirst,
                      );
                    },
                    child: const Text(
                      "Back To Home",
                      style: TextStyle(fontSize: 16, color: Colors.black87),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}