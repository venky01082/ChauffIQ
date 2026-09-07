import 'package:flutter/material.dart';

class FamilyMonitoringScreen extends StatelessWidget {
  const FamilyMonitoringScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.family_restroom, color: Colors.amber),
            SizedBox(width: 8),
            Text("Family Safety Shield"),
          ],
        ),
        backgroundColor: const Color(0xFF0F172A),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── 1. Live Monitored Ride Card ─────────────────────────────────
            _buildActiveRideCard(context),

            const SizedBox(height: 20),

            // ── 2. Real-time Telematics & Safety Telemetry ──────────────────
            _buildSafetyTelemetryCard(),

            const SizedBox(height: 20),

            // ── 3. Family Members Circle ────────────────────────────────────
            _buildFamilyCircleSection(context),

            const SizedBox(height: 20),

            // ── 4. Remote Emergency Action Controls ─────────────────────────
            _buildRemoteEmergencyCard(context),
            const SizedBox(height: 25),
          ],
        ),
      ),
    );
  }

  // ─── Active Ride Card ─────────────────────────────────────────────────────
  Widget _buildActiveRideCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: Colors.blue.shade200, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: const BoxDecoration(
                      color: Colors.green,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    "LIVE MONITORING ACTIVE",
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  "ETA: 12 Mins",
                  style: TextStyle(
                    color: Colors.blue,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Rider & Driver Row
          Row(
            children: [
              const CircleAvatar(
                radius: 28,
                backgroundColor: Colors.indigo,
                child: Icon(Icons.person, color: Colors.white, size: 32),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Sneha Sharma (Daughter)",
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      "With Rahul Sharma • BMW AP16FF4912",
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      "⭐ 4.8 Verified Chauffeur",
                      style: TextStyle(fontSize: 12, color: Colors.amber, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const Divider(height: 24),

          // Route Points
          Row(
            children: [
              Column(
                children: [
                  const Icon(Icons.radio_button_checked, size: 16, color: Colors.green),
                  Container(height: 18, width: 2, color: Colors.grey.shade300),
                  const Icon(Icons.location_on, size: 16, color: Colors.red),
                ],
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Pickup: Cyber Towers, Hitech City", style: TextStyle(fontSize: 13)),
                    SizedBox(height: 12),
                    Text("Drop: Home (Madhapur Green Meadows)", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── Safety Telemetry ─────────────────────────────────────────────────────
  Widget _buildSafetyTelemetryCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.speed, color: Colors.blue),
              SizedBox(width: 8),
              Text(
                "Live Vehicle Telematics & AI Guardian",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _telemetryItem("Speed", "42 km/h", "Safe Speed", Colors.green),
              ),
              Expanded(
                child: _telemetryItem("Route Deviation", "0%", "On Optimal Path", Colors.green),
              ),
              Expanded(
                child: _telemetryItem("Sudden Stops", "None", "Smooth Ride", Colors.green),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _telemetryItem(String label, String value, String status, Color statusColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(
          status,
          style: TextStyle(fontSize: 10, color: statusColor, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  // ─── Family Circle ────────────────────────────────────────────────────────
  Widget _buildFamilyCircleSection(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                "Family Members Connected",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              TextButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Invite family member link copied.")),
                  );
                },
                icon: const Icon(Icons.person_add_alt, size: 16),
                label: const Text("Invite"),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _memberTile("Sneha Sharma", "Daughter • Active on Trip", true),
          const Divider(),
          _memberTile("Pooja Sharma", "Spouse • At Home", false),
          const Divider(),
          _memberTile("Ramesh Sharma", "Father • Senior Citizen Mode", false),
        ],
      ),
    );
  }

  Widget _memberTile(String name, String relation, bool isActive) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: isActive ? Colors.green.shade100 : Colors.grey.shade200,
                child: Icon(
                  Icons.person_outline,
                  color: isActive ? Colors.green.shade800 : Colors.black54,
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                  Text(relation, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                ],
              ),
            ],
          ),
          if (isActive)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text(
                "Tracking",
                style: TextStyle(color: Colors.green, fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
    );
  }

  // ─── Remote Safety Controls ───────────────────────────────────────────────
  Widget _buildRemoteEmergencyCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.shield_outlined, color: Colors.red),
              SizedBox(width: 8),
              Text(
                "Remote Safety Actions",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.red),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            "As a registered family guardian, you can call or trigger safety alerts directly for Sneha's ride.",
            style: TextStyle(fontSize: 12, color: Colors.red.shade900),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Calling Sneha's driver Rahul...")),
                    );
                  },
                  icon: const Icon(Icons.call, size: 16),
                  label: const Text("Call Driver"),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text("Trigger Remote SOS?"),
                        content: const Text(
                          "This will sound an alert in the driver's vehicle and notify the ChauffiQ Safety Response Unit & Police (112).",
                        ),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                            onPressed: () {
                              Navigator.pop(ctx);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text("🚨 Remote SOS Dispatched! Response unit contacted."),
                                  backgroundColor: Colors.red,
                                ),
                              );
                            },
                            child: const Text("TRIGGER SOS"),
                          ),
                        ],
                      ),
                    );
                  },
                  icon: const Icon(Icons.warning, size: 16),
                  label: const Text("Remote SOS"),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
