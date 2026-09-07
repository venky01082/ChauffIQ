import 'package:flutter/material.dart';

import '../models/driver.dart';
import '../widgets/driver_photo_widget.dart';
import 'booking_success_screen.dart';

class DriverDetailsScreen extends StatefulWidget {
  final String userName;
  final String pickup;
  final String drop;
  final String vehicle;
  final Driver driver;

  const DriverDetailsScreen({
    super.key,
    required this.userName,
    required this.pickup,
    required this.drop,
    required this.vehicle,
    required this.driver,
  });

  @override
  State<DriverDetailsScreen> createState() => _DriverDetailsScreenState();
}

class _DriverDetailsScreenState extends State<DriverDetailsScreen> {
  bool _isFavorite = false;
  bool _shareWithFamily = true;
  String? _recurringSchedule; // null, "Daily (Mon-Fri)", "Weekly (Sundays)"

  void _showRecurringBookingDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.replay_circle_filled, color: Colors.blue),
                    SizedBox(width: 8),
                    Text(
                      "Setup Recurring Booking",
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              "Lock in ${widget.driver.name} as your dedicated driver for regular schedules.",
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
            const SizedBox(height: 18),
            _recurringOption(ctx, "Daily Office Commute (Mon–Fri, 8:30 AM)", "Daily (Mon-Fri)"),
            _recurringOption(ctx, "Weekend Outstation Commute (Saturdays, 7:00 AM)", "Weekend (Saturdays)"),
            _recurringOption(ctx, "Custom Frequency (Choose Days & Times)", "Custom Schedule"),
          ],
        ),
      ),
    );
  }

  Widget _recurringOption(BuildContext ctx, String label, String key) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      width: double.infinity,
      child: OutlinedButton(
        style: OutlinedButton.styleFrom(
          alignment: Alignment.centerLeft,
          padding: const EdgeInsets.all(14),
          side: BorderSide(
            color: _recurringSchedule == key ? Colors.blue : Colors.grey.shade300,
            width: _recurringSchedule == key ? 1.8 : 1,
          ),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        onPressed: () {
          setState(() {
            _recurringSchedule = key;
          });
          Navigator.pop(ctx);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("Recurring Schedule Set: $key with ${widget.driver.name}"),
              backgroundColor: Colors.blue,
            ),
          );
        },
        child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.black87)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Driver Profile'),
        backgroundColor: Colors.blue,
        actions: [
          // Favorite Driver Toggle (Feature 4)
          IconButton(
            tooltip: _isFavorite ? "Remove from Favorites" : "Add to Favorites",
            icon: Icon(
              _isFavorite ? Icons.favorite : Icons.favorite_border,
              color: _isFavorite ? Colors.redAccent : Colors.white,
            ),
            onPressed: () {
              setState(() {
                _isFavorite = !_isFavorite;
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    _isFavorite
                        ? "❤️ ${widget.driver.name} added to your Favorite Drivers!"
                        : "Removed from Favorites.",
                  ),
                  backgroundColor: _isFavorite ? Colors.pink : Colors.grey.shade800,
                  duration: const Duration(seconds: 2),
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // ── 1. Driver Profile Hero Card ─────────────────────────────────
            Card(
              elevation: 3,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Stack(
                      children: [
                        DriverAvatar(driver: widget.driver, radius: 55),
                        if (_isFavorite)
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(
                                color: Colors.redAccent,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.favorite, size: 16, color: Colors.white),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      widget.driver.name,
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.star, color: Colors.amber, size: 18),
                        const SizedBox(width: 4),
                        Text(
                          "${widget.driver.rating}",
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          "• Verified ChauffiQ Partner",
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // License Plate badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.yellow.shade100,
                        border: Border.all(color: Colors.black45),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        widget.driver.vehicleNumber,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),
                    const Divider(),
                    const SizedBox(height: 10),

                    // Stats row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _infoCol("Vehicle", widget.driver.vehicleType),
                        _infoCol("ETA", widget.driver.eta),
                        _infoCol("Fare", "₹${widget.driver.fare}"),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // ── 2. Recurring Booking & Favorite Bar (Feature 4) ─────────────
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.event_repeat, color: Colors.blue),
                            SizedBox(width: 8),
                            Text(
                              "Recurring Booking",
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        TextButton(
                          onPressed: _showRecurringBookingDialog,
                          child: Text(_recurringSchedule ?? "Setup Schedule"),
                        ),
                      ],
                    ),
                    if (_recurringSchedule != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          "Active Schedule: $_recurringSchedule",
                          style: const TextStyle(color: Colors.blue, fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // ── 3. Trip Summary ─────────────────────────────────────────────
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Trip Route Details",
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const Icon(Icons.radio_button_checked, size: 16, color: Colors.green),
                        const SizedBox(width: 10),
                        Expanded(child: Text("Pickup: ${widget.pickup}")),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.location_on, size: 16, color: Colors.red),
                        const SizedBox(width: 10),
                        Expanded(child: Text("Drop: ${widget.drop}")),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // ── 4. Pre-Ride Family Safety Shield Auto-Share ─────────────────
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: SwitchListTile(
                contentPadding: EdgeInsets.zero,
                secondary: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.indigo.shade50,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.family_restroom, color: Colors.indigo, size: 20),
                ),
                title: const Text(
                  "Share Trip with Family Circle",
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                ),
                subtitle: const Text(
                  "Send live tracking link to emergency contacts",
                  style: TextStyle(fontSize: 11, color: Colors.grey),
                ),
                value: _shareWithFamily,
                activeThumbColor: Colors.indigo,
                onChanged: (val) => setState(() => _shareWithFamily = val),
              ),
            ),

            const SizedBox(height: 20),

            // ── 5. Confirm Booking Button ───────────────────────────────────
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => BookingSuccessScreen(
                        driver: widget.driver,
                        userName: widget.userName,
                        pickup: widget.pickup,
                        drop: widget.drop,
                        vehicle: widget.vehicle,
                      ),
                    ),
                  );
                },
                child: Text(
                  _recurringSchedule != null
                      ? 'Confirm Recurring Booking • ₹${widget.driver.fare}'
                      : 'Confirm Booking • ₹${widget.driver.fare}',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoCol(String title, String val) {
    return Column(
      children: [
        Text(title, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        const SizedBox(height: 4),
        Text(val, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      ],
    );
  }
}