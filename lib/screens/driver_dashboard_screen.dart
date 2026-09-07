import 'dart:async';
import 'package:flutter/material.dart';
import 'driver_earnings_screen.dart';
import 'driver_intelligence_screen.dart';
import 'driver_documents_screen.dart';

class DriverDashboardScreen extends StatefulWidget {
  const DriverDashboardScreen({super.key});

  @override
  State<DriverDashboardScreen> createState() => _DriverDashboardScreenState();
}

class _DriverDashboardScreenState extends State<DriverDashboardScreen> {
  bool _isOnline = true;
  int _todayEarnings = 2450;
  int _completedTrips = 6;
  bool _hasIncomingRequest = false;

  // Countdown timer for incoming request
  int _countdown = 15;
  Timer? _timer;
  Timer? _initialSimTimer;

  // Active accepted trip
  Map<String, dynamic>? _activeTrip;
  int _tripStep = 0; // 0 = en route to pickup, 1 = at pickup, 2 = on trip, 3 = finished

  @override
  void initState() {
    super.initState();
    // Simulate an incoming request after 2.5 seconds if online
    _initialSimTimer = Timer(const Duration(milliseconds: 2500), () {
      if (mounted && _isOnline && _activeTrip == null) {
        _triggerIncomingRequest();
      }
    });
  }

  @override
  void dispose() {
    _initialSimTimer?.cancel();
    _timer?.cancel();
    super.dispose();
  }

  void _triggerIncomingRequest() {
    setState(() {
      _hasIncomingRequest = true;
      _countdown = 15;
    });
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_countdown > 1) {
        setState(() {
          _countdown--;
        });
      } else {
        t.cancel();
        setState(() {
          _hasIncomingRequest = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Request timed out.")),
        );
      }
    });
  }

  void _acceptRide() {
    _timer?.cancel();
    setState(() {
      _hasIncomingRequest = false;
      _activeTrip = {
        "riderName": "Priya Sharma",
        "rating": 4.9,
        "pickup": "Cyber Towers, Hitech City",
        "drop": "Rajiv Gandhi Intl. Airport",
        "distance": "32 km",
        "fare": 850,
        "phone": "+91 9123456789",
      };
      _tripStep = 0;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Ride Accepted! Head to pickup location."),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _rejectRide() {
    _timer?.cancel();
    setState(() {
      _hasIncomingRequest = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Ride declined.")),
    );
  }

  void _advanceTripStep() {
    setState(() {
      if (_tripStep == 0) {
        _tripStep = 1; // Arrived at pickup
      } else if (_tripStep == 1) {
        _tripStep = 2; // Started trip
      } else if (_tripStep == 2) {
        // Complete trip
        _todayEarnings += (_activeTrip!["fare"] as int);
        _completedTrips += 1;
        _activeTrip = null;
        _tripStep = 0;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("🎉 Trip Completed! Fare credited to your wallet."),
            backgroundColor: Colors.green,
          ),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F9FC),
      appBar: AppBar(
        title: const Text("Driver Dashboard"),
        backgroundColor: Colors.blue,
        actions: [
          IconButton(
            icon: const Icon(Icons.account_balance_wallet_outlined),
            tooltip: "Earnings & Wallet",
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const DriverEarningsScreen(),
                ),
              );
            },
          ),
          // Simulate Incoming Request Trigger button
          TextButton.icon(
            style: TextButton.styleFrom(foregroundColor: Colors.white),
            onPressed: () {
              if (_isOnline && _activeTrip == null) {
                _triggerIncomingRequest();
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Switch Online first to receive requests")),
                );
              }
            },
            icon: const Icon(Icons.flash_on, size: 18),
            label: const Text("Simulate Request"),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // ── 1. Online / Offline Status Toggle Card ───────────────────────
            _buildStatusToggleCard(),

            const SizedBox(height: 16),

            // ── 2. Today's Key Metrics / Earnings ───────────────────────────
            _buildMetricsGrid(),

            const SizedBox(height: 16),

            // ── 2B. Driver Performance Intelligence Card (Feature 7) ─────────
            InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const DriverIntelligenceScreen(),
                  ),
                );
              },
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.indigo.shade900, Colors.blue.shade900],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.psychology_outlined, color: Colors.amber, size: 32),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Driver IQ Score: 94 / 100",
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                          SizedBox(height: 2),
                          Text(
                            "Punctuality 98% • Safe Telematics 96% • Tap for AI Insights",
                            style: TextStyle(color: Colors.white70, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: Colors.white70),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // ── 2C. Chauffeur Document Verification (Mandatory Compliance) ────────
            InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const DriverDocumentsScreen(),
                  ),
                );
              },
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.amber.shade400, width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.verified_user, color: Colors.amber, size: 24),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                "Document Verification",
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                              SizedBox(width: 6),
                              Text(
                                "2/4 VERIFIED",
                                style: TextStyle(
                                  color: Colors.amber,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                          SizedBox(height: 2),
                          Text(
                            "DL & Aadhaar Approved • RC & Insurance Pending",
                            style: TextStyle(color: Colors.grey, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // ── 3. Incoming Request Card (if triggered) ─────────────────────
            if (_hasIncomingRequest) ...[
              _buildIncomingRequestCard(),
              const SizedBox(height: 20),
            ],

            // ── 4. Active Trip Lifecycle Card (if accepted) ─────────────────
            if (_activeTrip != null) ...[
              _buildActiveTripCard(),
              const SizedBox(height: 20),
            ],

            // ── 5. Quick Shift Tips & Incentives ────────────────────────────
            _buildIncentiveBanner(),

            const SizedBox(height: 20),

            // ── 6. Today's Completed Rides ──────────────────────────────────
            _buildRecentActivityList(),
          ],
        ),
      ),
    );
  }

  // ─── Online / Offline Toggle Card ─────────────────────────────────────────
  Widget _buildStatusToggleCard() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _isOnline ? Colors.green.shade300 : Colors.grey.shade300,
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _isOnline ? Colors.green : Colors.grey,
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _isOnline ? "YOU ARE ONLINE" : "YOU ARE OFFLINE",
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: _isOnline ? Colors.green.shade800 : Colors.grey.shade700,
                    ),
                  ),
                  Text(
                    _isOnline ? "Searching for nearby rider requests..." : "Turn online to accept rides",
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
            ],
          ),
          Switch(
            value: _isOnline,
            activeThumbColor: Colors.green,
            onChanged: (val) {
              setState(() {
                _isOnline = val;
                if (!_isOnline) {
                  _hasIncomingRequest = false;
                  _timer?.cancel();
                }
              });
            },
          ),
        ],
      ),
    );
  }

  // ─── Metrics Grid ─────────────────────────────────────────────────────────
  Widget _buildMetricsGrid() {
    return Row(
      children: [
        Expanded(
          child: _metricCard(
            title: "Today's Earnings",
            value: "₹$_todayEarnings",
            icon: Icons.currency_rupee,
            color: Colors.blue,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _metricCard(
            title: "Trips Done",
            value: "$_completedTrips",
            icon: Icons.check_circle_outline,
            color: Colors.green,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _metricCard(
            title: "Rating",
            value: "4.9 ⭐",
            icon: Icons.star_outline,
            color: Colors.amber.shade800,
          ),
        ),
      ],
    );
  }

  Widget _metricCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }

  // ─── Incoming Request Card ────────────────────────────────────────────────
  Widget _buildIncomingRequestCard() {
    return Card(
      elevation: 6,
      color: Colors.blue.shade50,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Colors.blue, width: 2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.notifications_active, color: Colors.blue),
                    SizedBox(width: 8),
                    Text(
                      "New Ride Request!",
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.blue),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.blue,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    "${_countdown}s",
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const Divider(height: 20),

            // Rider Info
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Priya Sharma",
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      "⭐ 4.9 • 42 trips",
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
                Text(
                  "₹850",
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.green.shade700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Locations
            const Row(
              children: [
                Icon(Icons.radio_button_checked, size: 16, color: Colors.green),
                SizedBox(width: 8),
                Expanded(
                  child: Text("Cyber Towers, Hitech City (1.2 km away)"),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Row(
              children: [
                Icon(Icons.location_on, size: 16, color: Colors.red),
                SizedBox(width: 8),
                Expanded(
                  child: Text("Rajiv Gandhi Intl. Airport (32 km)"),
                ),
              ],
            ),

            const SizedBox(height: 18),

            // Accept / Reject Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Colors.red),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: _rejectRide,
                    child: const Text("Decline"),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: _acceptRide,
                    child: const Text("ACCEPT RIDE", style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ─── Active Accepted Trip Card ────────────────────────────────────────────
  Widget _buildActiveTripCard() {
    String stepButtonText = "ARRIVED AT PICKUP";
    Color stepColor = Colors.orange;

    if (_tripStep == 1) {
      stepButtonText = "START TRIP";
      stepColor = Colors.blue;
    } else if (_tripStep == 2) {
      stepButtonText = "COMPLETE TRIP & COLLECT ₹${_activeTrip!["fare"]}";
      stepColor = Colors.green;
    }

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _tripStep == 0
                        ? "Heading to Pickup"
                        : _tripStep == 1
                            ? "Waiting for Rider"
                            : "Trip in Progress",
                    style: const TextStyle(
                      color: Colors.blue,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                Text(
                  "₹${_activeTrip!["fare"]}",
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              "Rider: ${_activeTrip!["riderName"]}",
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
            ),
            Text(
              "Contact: ${_activeTrip!["phone"]}",
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
            const Divider(height: 20),
            Text("From: ${_activeTrip!["pickup"]}", style: const TextStyle(fontSize: 13)),
            const SizedBox(height: 4),
            Text("To: ${_activeTrip!["drop"]}", style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: stepColor,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: _advanceTripStep,
                child: Text(
                  stepButtonText,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Incentives / Bonus Banner ────────────────────────────────────────────
  Widget _buildIncentiveBanner() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.indigo.shade600, Colors.blue.shade500],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          const Icon(Icons.workspace_premium, color: Colors.amber, size: 38),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "Peak Hour Bonus: +₹150",
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  "Complete 2 more rides before 8:00 PM to unlock bonus.",
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── Recent Completed Activity ────────────────────────────────────────────
  Widget _buildRecentActivityList() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Recent Completed Trips",
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          _tripTile("Rahul Verma", "Kondapur → Gachibowli", "₹320", "1:45 PM"),
          const Divider(),
          _tripTile("Ananya Roy", "Madhapur → Jubilee Hills", "₹260", "12:10 PM"),
          const Divider(),
          _tripTile("Siddharth K.", "Banjara Hills → Airport", "₹890", "10:30 AM"),
        ],
      ),
    );
  }

  Widget _tripTile(String rider, String route, String fare, String time) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(rider, style: const TextStyle(fontWeight: FontWeight.w600)),
              Text(route, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                fare,
                style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green),
              ),
              Text(time, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
            ],
          ),
        ],
      ),
    );
  }
}
