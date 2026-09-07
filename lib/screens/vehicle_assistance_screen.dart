import 'package:flutter/material.dart';

class VehicleAssistanceScreen extends StatelessWidget {
  const VehicleAssistanceScreen({super.key});

  final List<Map<String, dynamic>> _reminders = const [
    {
      "title": "Vehicle Insurance Renewal",
      "status": "Due in 15 Days",
      "date": "Expires: 20 Sep 2026",
      "severity": "urgent",
      "icon": Icons.security,
      "color": Colors.orange,
      "details": "Policy #BA-8921-2025 • Comprehensive Cover",
      "action": "Renew Online",
    },
    {
      "title": "Pollution Certificate (PUC)",
      "status": "Due in 30 Days",
      "date": "Expires: 05 Oct 2026",
      "severity": "warning",
      "icon": Icons.eco,
      "color": Colors.amber,
      "details": "PUC Cert #HYD-9812-PUC",
      "action": "Find PUC Center",
    },
    {
      "title": "Periodic Engine & Brake Service",
      "status": "Due in 450 km",
      "date": "Est: Next 12 Days",
      "severity": "info",
      "icon": Icons.build_circle_outlined,
      "color": Colors.blue,
      "details": "Scheduled 30,000 km Oil & Filter Service",
      "action": "Book Mechanic",
    },
    {
      "title": "Driver's Commercial License",
      "status": "Valid for 90 Days",
      "date": "Expires: 05 Dec 2026",
      "severity": "normal",
      "icon": Icons.badge_outlined,
      "color": Colors.green,
      "details": "DL #TS09-2018-0091244",
      "action": "View Document",
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.car_repair, color: Colors.amber),
            SizedBox(width: 8),
            Text("Vehicle Assistant & Vault"),
          ],
        ),
        backgroundColor: const Color(0xFF0F172A),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── 1. Vehicle Identity Card ────────────────────────────────────
            _buildVehicleHeroCard(),

            const SizedBox(height: 20),

            // ── 2. Health & Document Status Reminders ───────────────────────
            const Text(
              "Compliance & Maintenance Reminders",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            ..._reminders.map((r) => _reminderCard(context, r)),

            const SizedBox(height: 20),

            // ── 3. ChauffiQ Doorstep Vehicle Care CTA ───────────────────────
            _buildDoorstepCareCard(context),
            const SizedBox(height: 25),
          ],
        ),
      ),
    );
  }

  Widget _buildVehicleHeroCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue.shade900, Colors.indigo.shade800],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.blue.withValues(alpha: 0.25),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "BMW 3 Series",
                    style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    "AP 16 FF 4912 • Sedan",
                    style: TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.green,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  "ROAD READY",
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          const Divider(color: Colors.white24),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _specCol("Odometer", "28,450 km"),
              _specCol("Fuel", "Petrol • 80%"),
              _specCol("Tire Pressure", "33 PSI (All 4)"),
              _specCol("Health Score", "98 / 100"),
            ],
          ),
        ],
      ),
    );
  }

  Widget _specCol(String title, String val) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 10, color: Colors.white60)),
        const SizedBox(height: 2),
        Text(val, style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _reminderCard(BuildContext context, Map<String, dynamic> r) {
    final Color color = r["color"] as Color;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(r["icon"] as IconData, color: color, size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        r["title"] as String,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        r["date"] as String,
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    r["status"] as String,
                    style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              r["details"] as String,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
            ),
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: color,
                  foregroundColor: Colors.white,
                  visualDensity: VisualDensity.compact,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text("${r["action"]} triggered.")),
                  );
                },
                child: Text(r["action"] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDoorstepCareCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.amber.shade300),
      ),
      child: Row(
        children: [
          const Icon(Icons.home_repair_service, color: Colors.amber, size: 36),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "ChauffiQ Doorstep Care",
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                const SizedBox(height: 2),
                Text(
                  "Get verified mechanics to inspect brakes, fluids & battery at your home.",
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                ),
              ],
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.amber.shade800),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Doorstep mechanic visit requested.")),
              );
            },
            child: const Text("Book Now", style: TextStyle(fontSize: 12)),
          ),
        ],
      ),
    );
  }
}
