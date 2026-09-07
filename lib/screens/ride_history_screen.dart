import 'package:flutter/material.dart';

class RideHistoryScreen extends StatelessWidget {
  const RideHistoryScreen({super.key});

  // Mock list of past trips
  static final List<Map<String, dynamic>> pastTrips = [
    {
      "id": "CQ-9812",
      "date": "Today, 02:15 PM",
      "driverName": "Rahul Sharma",
      "vehicle": "BMW • AP16FF4912",
      "pickup": "Hitech City Metro Station",
      "drop": "Inorbit Mall, Madhapur",
      "fare": 650,
      "status": "Completed",
      "rating": 5,
      "paymentMethod": "UPI (Google Pay)",
    },
    {
      "id": "CQ-8741",
      "date": "03 Sep 2026, 09:30 AM",
      "driverName": "Ravi Kumar",
      "vehicle": "Swift Dzire • TS09AB1234",
      "pickup": "Banjara Hills Road No. 12",
      "drop": "Rajiv Gandhi Intl. Airport",
      "fare": 850,
      "status": "Completed",
      "rating": 4,
      "paymentMethod": "Cash",
    },
    {
      "id": "CQ-7219",
      "date": "31 Aug 2026, 06:45 PM",
      "driverName": "Vikram Singh",
      "vehicle": "Hyundai Creta • AP28XY9988",
      "pickup": "Gachibowli Stadium",
      "drop": "Jubilee Hills Check Post",
      "fare": 420,
      "status": "Cancelled",
      "rating": 0,
      "paymentMethod": "Refunded",
    },
  ];

  // Mock upcoming trips
  static final List<Map<String, dynamic>> upcomingTrips = [
    {
      "id": "CQ-1042",
      "date": "Tomorrow, 08:00 AM",
      "driverName": "Assigned upon arrival",
      "vehicle": "Sedan (ChauffiQ Premium)",
      "pickup": "Residence, Kondapur",
      "drop": "Secunderabad Railway Station",
      "estimatedFare": 580,
      "status": "Scheduled",
    },
  ];

  void _showReceiptDialog(BuildContext context, Map<String, dynamic> trip) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    "Trip Receipt",
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      trip["id"],
                      style: const TextStyle(
                        color: Colors.blue,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                trip["date"],
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
              ),
              const Divider(height: 24),

              _receiptRow("Base Fare", "₹120"),
              _receiptRow("Distance Fare (14 km)", "₹${trip["fare"] - 180}"),
              _receiptRow("Tolls & Taxes", "₹60"),
              const Divider(height: 20),
              _receiptRow("Total Paid", "₹${trip["fare"]}", isBold: true),
              const SizedBox(height: 6),
              Text(
                "Paid via ${trip["paymentMethod"]}",
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text("Close Receipt"),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _receiptRow(String title, String amount, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: isBold ? 16 : 14,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          Text(
            amount,
            style: TextStyle(
              fontSize: isBold ? 18 : 14,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: isBold ? Colors.blue : Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: const Color(0xFFF7F9FC),
        appBar: AppBar(
          title: const Text("My Rides"),
          backgroundColor: Colors.blue,
          bottom: const TabBar(
            indicatorColor: Colors.white,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            tabs: [
              Tab(text: "Past Rides"),
              Tab(text: "Upcoming"),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            // ── Tab 1: Past Trips ───────────────────────────────────────────
            ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: pastTrips.length,
              itemBuilder: (context, index) {
                final trip = pastTrips[index];
                final isCompleted = trip["status"] == "Completed";

                return Card(
                  margin: const EdgeInsets.only(bottom: 16),
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header: Date & Status Badge
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              trip["date"],
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey.shade600,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isCompleted
                                    ? Colors.green.shade50
                                    : Colors.red.shade50,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                trip["status"],
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: isCompleted ? Colors.green : Colors.red,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),

                        // Route Column
                        Row(
                          children: [
                            Column(
                              children: [
                                const Icon(Icons.radio_button_checked, size: 16, color: Colors.green),
                                Container(
                                  height: 20,
                                  width: 2,
                                  color: Colors.grey.shade300,
                                ),
                                const Icon(Icons.location_on, size: 16, color: Colors.red),
                              ],
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    trip["pickup"],
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                                  ),
                                  const SizedBox(height: 14),
                                  Text(
                                    trip["drop"],
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        const Divider(height: 24),

                        // Driver & Vehicle + Fare
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  trip["driverName"],
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                Text(
                                  trip["vehicle"],
                                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                ),
                              ],
                            ),
                            Text(
                              "₹${trip["fare"]}",
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.blue,
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 12),

                        // Actions Row (Receipt & Rebook)
                        Row(
                          children: [
                            OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                visualDensity: VisualDensity.compact,
                              ),
                              onPressed: () => _showReceiptDialog(context, trip),
                              icon: const Icon(Icons.receipt_long, size: 16),
                              label: const Text("Receipt", style: TextStyle(fontSize: 12)),
                            ),
                            const SizedBox(width: 10),
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                visualDensity: VisualDensity.compact,
                                backgroundColor: Colors.blue,
                              ),
                              onPressed: () {
                                Navigator.pop(context); // return to home to book
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text("Rebooking route: ${trip["drop"]}"),
                                  ),
                                );
                              },
                              icon: const Icon(Icons.replay, size: 16),
                              label: const Text("Rebook", style: TextStyle(fontSize: 12)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),

            // ── Tab 2: Upcoming Trips ───────────────────────────────────────
            ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: upcomingTrips.length,
              itemBuilder: (context, index) {
                final trip = upcomingTrips[index];
                return Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.schedule, size: 16, color: Colors.orange),
                                const SizedBox(width: 6),
                                Text(
                                  trip["date"],
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: Colors.orange.shade50,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                "Scheduled",
                                style: TextStyle(
                                  color: Colors.orange,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          "From: ${trip["pickup"]}",
                          style: const TextStyle(fontSize: 13),
                        ),
                        Text(
                          "To: ${trip["drop"]}",
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                        const Divider(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              "Est. Fare: ₹${trip["estimatedFare"]}",
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue),
                            ),
                            TextButton(
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text("Upcoming ride cancelled.")),
                                );
                              },
                              child: const Text("Cancel Ride", style: TextStyle(color: Colors.red)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
