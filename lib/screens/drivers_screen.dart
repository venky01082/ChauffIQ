import 'package:flutter/material.dart';

import '../data/driver_database.dart';
import '../models/driver.dart';
import '../widgets/driver_photo_widget.dart';
import 'driver_details_screen.dart';

class DriversScreen extends StatefulWidget {
  final String userName;
  final String pickup;
  final String drop;
  final String vehicle;

  const DriversScreen({
    super.key,
    required this.userName,
    required this.pickup,
    required this.drop,
    required this.vehicle,
  });

  @override
  State<DriversScreen> createState() => _DriversScreenState();
}

class _DriversScreenState extends State<DriversScreen> {
  String _selectedFilter = "Smart Match";

  List<Driver> get _allDrivers {
    final List<Driver> list = List.from(DriverDatabase.drivers);
    if (list.isEmpty) {
      // Provide high-quality fallback demo drivers
      list.addAll([
        Driver(
          name: "Rahul Sharma",
          phone: "+91 98765 43210",
          vehicleType: widget.vehicle.isNotEmpty ? widget.vehicle : "Sedan",
          vehicleNumber: "AP16FF4912",
          rating: 4.9,
          eta: "3 min",
          fare: 450,
        ),
        Driver(
          name: "Ravi Kumar",
          phone: "+91 91234 56789",
          vehicleType: "Car",
          vehicleNumber: "TS09AB1234",
          rating: 4.8,
          eta: "6 min",
          fare: 380,
        ),
        Driver(
          name: "Siddharth Verma",
          phone: "+91 99887 76655",
          vehicleType: "SUV",
          vehicleNumber: "TS07XY9988",
          rating: 4.7,
          eta: "8 min",
          fare: 620,
        ),
      ]);
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final drivers = _allDrivers;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Available Drivers'),
        backgroundColor: Colors.blue,
      ),
      body: Column(
        children: [
          // ── 1. AI Recommendation Banner ───────────────────────────────────
          Container(
            margin: const EdgeInsets.fromLTRB(16, 12, 16, 6),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.blue.shade900, Colors.indigo.shade800],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.amber.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.psychology, color: Colors.amber, size: 26),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Smart Chauffeur Match",
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        "Ranked by proximity, driving smoothness & customer safety index.",
                        style: TextStyle(color: Colors.white70, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── 2. Filter Pills ───────────────────────────────────────────────
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            child: Row(
              children: [
                "Smart Match",
                "Fastest ETA",
                "Top Rated",
                "Lowest Fare",
              ].map((filter) {
                final isSelected = _selectedFilter == filter;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(filter),
                    selected: isSelected,
                    selectedColor: Colors.blue.shade100,
                    checkmarkColor: Colors.blue,
                    labelStyle: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      color: isSelected ? Colors.blue.shade900 : Colors.black87,
                    ),
                    onSelected: (val) {
                      setState(() {
                        _selectedFilter = filter;
                      });
                    },
                  ),
                );
              }).toList(),
            ),
          ),

          // ── 3. Drivers List ───────────────────────────────────────────────
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(14, 4, 14, 16),
              itemCount: drivers.length,
              itemBuilder: (context, index) {
                final driver = drivers[index];
                final bool isAiRecommended = index == 0;
                final String aiMatchPercent = isAiRecommended ? "96%" : (index == 1 ? "91%" : "87%");
                final String distance = isAiRecommended ? "1.2 km" : "${(1.2 + index * 0.8).toStringAsFixed(1)} km";

                return Card(
                  margin: const EdgeInsets.only(bottom: 16),
                  elevation: isAiRecommended ? 4 : 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: isAiRecommended
                        ? const BorderSide(color: Colors.amber, width: 2)
                        : BorderSide(color: Colors.grey.shade200),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Top Badge Row: AI Match & Distance
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isAiRecommended ? Colors.amber.shade100 : Colors.blue.shade50,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isAiRecommended ? Colors.amber.shade700 : Colors.blue.shade200,
                                  width: 1,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.auto_awesome,
                                    size: 14,
                                    color: isAiRecommended ? Colors.amber.shade900 : Colors.blue.shade700,
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    "Smart Match $aiMatchPercent",
                                    style: TextStyle(
                                      color: isAiRecommended ? Colors.amber.shade900 : Colors.blue.shade900,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Row(
                              children: [
                                const Icon(Icons.near_me, size: 14, color: Colors.grey),
                                const SizedBox(width: 4),
                                Text(
                                  "Distance: $distance",
                                  style: TextStyle(fontSize: 12, color: Colors.grey.shade700, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),

                        // Driver Profile & Vehicle Info
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            DriverAvatar(driver: driver, radius: 32),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        driver.name,
                                        style: const TextStyle(
                                          fontSize: 17,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      const Icon(Icons.verified, color: Colors.blue, size: 16),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Row(
                                    children: [
                                      const Icon(Icons.star, color: Colors.amber, size: 16),
                                      const SizedBox(width: 4),
                                      Text(
                                        "${driver.rating}",
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        "• ETA: ${driver.eta}",
                                        style: const TextStyle(
                                          color: Colors.green,
                                          fontWeight: FontWeight.w600,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    "Vehicle: ${driver.vehicleType}",
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                      color: Colors.grey.shade800,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  // Yellow License Plate
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.yellow.shade100,
                                      border: Border.all(color: Colors.black45),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      "Plate: ${driver.vehicleNumber}",
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 11,
                                        letterSpacing: 0.8,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 14),
                        const Divider(height: 1),
                        const SizedBox(height: 12),

                        // Bottom Price & Book Now Row
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  "Estimated Fare",
                                  style: TextStyle(fontSize: 11, color: Colors.grey),
                                ),
                                Text(
                                  "₹${driver.fare}",
                                  style: const TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.blue,
                                  ),
                                ),
                              ],
                            ),
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.blue,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => DriverDetailsScreen(
                                      userName: widget.userName,
                                      pickup: widget.pickup,
                                      drop: widget.drop,
                                      vehicle: widget.vehicle,
                                      driver: driver,
                                    ),
                                  ),
                                );
                              },
                              icon: const Icon(Icons.arrow_forward, size: 16),
                              label: const Text(
                                "Book Now",
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                            ),
                          ],
                        ),

                        // AI insight on Rahul
                        if (isAiRecommended) ...[
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.blue.shade50,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.info_outline, size: 16, color: Colors.blue),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    "AI Insight: 99.4% punctuality, smooth braking & top luxury rating.",
                                    style: TextStyle(fontSize: 11, color: Colors.black87),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}