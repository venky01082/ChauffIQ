import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../models/driver.dart';
import '../widgets/driver_photo_widget.dart';
import 'rating_review_screen.dart';
import 'family_monitoring_screen.dart';
import 'notifications_sheet.dart';
import '../services/api_service.dart';

/// Represents the stages of an active ride.
enum RideStage {
  driverEnRoute,
  driverArrived,
  tripInProgress,
  tripCompleted,
}

class RideTrackingScreen extends StatefulWidget {
  final Driver driver;
  final String userName;
  final String pickup;
  final String drop;
  final String vehicle;
  final String? rideId;

  const RideTrackingScreen({
    super.key,
    required this.driver,
    required this.userName,
    required this.pickup,
    required this.drop,
    required this.vehicle,
    this.rideId,
  });

  @override
  State<RideTrackingScreen> createState() => _RideTrackingScreenState();
}

class _RideTrackingScreenState extends State<RideTrackingScreen>
    with SingleTickerProviderStateMixin {
  RideStage _currentStage = RideStage.driverEnRoute;
  final String _rideOtp = "4821"; // Simulated start PIN for the driver

  // Real Map & Navigation State
  final MapController _mapController = MapController();
  double _zoomLevel = 14.5;
  bool _isDarkMap = false;

  // Real GPS Coordinates (Hyderabad: Hitech City Metro to Inorbit Mall)
  static const LatLng _pickupLocation = LatLng(17.4474, 78.3762);
  static const LatLng _dropLocation = LatLng(17.4339, 78.3866);
  static const List<LatLng> _routeCoordinates = [
    LatLng(17.4474, 78.3762),
    LatLng(17.4460, 78.3785),
    LatLng(17.4435, 78.3815),
    LatLng(17.4405, 78.3835),
    LatLng(17.4370, 78.3850),
    LatLng(17.4339, 78.3866),
  ];

  // Dynamic ETA & Distance Bindings
  String get _dynamicEta {
    switch (_currentStage) {
      case RideStage.driverEnRoute:
        return "${widget.driver.eta} min";
      case RideStage.driverArrived:
        return "Arrived";
      case RideStage.tripInProgress:
        return "11 min";
      case RideStage.tripCompleted:
        return "0 min";
    }
  }

  String get _dynamicDistance {
    switch (_currentStage) {
      case RideStage.driverEnRoute:
        return "1.4 km away";
      case RideStage.driverArrived:
        return "At Pickup Gate";
      case RideStage.tripInProgress:
        return "3.2 km remaining";
      case RideStage.tripCompleted:
        return "4.8 km completed";
    }
  }

  LatLng get _currentDriverLocation {
    final progress = _carProgressAnimation.value;
    final maxIdx = _routeCoordinates.length - 1;
    final scaled = progress * maxIdx;
    final index = scaled.floor().clamp(0, maxIdx - 1);
    final localT = scaled - index;
    final p1 = _routeCoordinates[index];
    final p2 = _routeCoordinates[index + 1];
    return LatLng(
      p1.latitude + (p2.latitude - p1.latitude) * localT,
      p1.longitude + (p2.longitude - p1.longitude) * localT,
    );
  }

  void _zoomIn() {
    setState(() {
      _zoomLevel = (_zoomLevel + 1.0).clamp(10.0, 18.0);
    });
    _mapController.move(_currentDriverLocation, _zoomLevel);
  }

  void _zoomOut() {
    setState(() {
      _zoomLevel = (_zoomLevel - 1.0).clamp(10.0, 18.0);
    });
    _mapController.move(_currentDriverLocation, _zoomLevel);
  }

  void _recenterMap() {
    _mapController.move(_currentDriverLocation, 15.0);
  }

  // Car animation along the route line
  late AnimationController _animController;
  late Animation<double> _carProgressAnimation;

  // Chat simulation state
  final List<Map<String, String>> _chatMessages = [
    {"sender": "driver", "text": "Hello! I am on my way to your location."},
  ];

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);

    _carProgressAnimation = Tween<double>(begin: 0.15, end: 0.85).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  // ─── Stage Transition Logic ───────────────────────────────────────────────
  void _advanceToNextStage() {
    setState(() {
      switch (_currentStage) {
        case RideStage.driverEnRoute:
          _currentStage = RideStage.driverArrived;
          break;
        case RideStage.driverArrived:
          _currentStage = RideStage.tripInProgress;
          break;
        case RideStage.tripInProgress:
          _currentStage = RideStage.tripCompleted;
          break;
        case RideStage.tripCompleted:
          _currentStage = RideStage.driverEnRoute;
          break;
      }
    });

    // Notify Cloud Functions backend
    final activeRideId = widget.rideId ??
        "ride_${DateTime.now().millisecondsSinceEpoch % 100000}";
    String status = "REQUESTED";
    if (_currentStage == RideStage.driverArrived) status = "ARRIVING";
    if (_currentStage == RideStage.tripInProgress) status = "STARTED";
    if (_currentStage == RideStage.tripCompleted) status = "COMPLETED";

    ApiService.updateRideStatus(rideId: activeRideId, status: status);

    // Broadcast GPS location
    final loc = _currentDriverLocation;
    ApiService.updateDriverLocation(
      rideId: activeRideId,
      latitude: loc.latitude,
      longitude: loc.longitude,
    );
  }

  String get _stageTitle {
    switch (_currentStage) {
      case RideStage.driverEnRoute:
        return "Driver is Arriving";
      case RideStage.driverArrived:
        return "Driver has Arrived";
      case RideStage.tripInProgress:
        return "Trip in Progress";
      case RideStage.tripCompleted:
        return "You have Arrived!";
    }
  }

  String get _stageSubtitle {
    switch (_currentStage) {
      case RideStage.driverEnRoute:
        return "ETA: ${widget.driver.eta} • 1.4 km away";
      case RideStage.driverArrived:
        return "Driver is waiting at your pickup point";
      case RideStage.tripInProgress:
        return "Heading towards ${widget.drop}";
      case RideStage.tripCompleted:
        return "Trip ended. Total fare: ₹${widget.driver.fare}";
    }
  }

  Color get _stageColor {
    switch (_currentStage) {
      case RideStage.driverEnRoute:
        return Colors.blue;
      case RideStage.driverArrived:
        return Colors.orange.shade700;
      case RideStage.tripInProgress:
        return Colors.indigo;
      case RideStage.tripCompleted:
        return Colors.green;
    }
  }

  // ─── Dialogs & Actions ───────────────────────────────────────────────────

  void _showCallDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DriverAvatar(driver: widget.driver, radius: 40),
            const SizedBox(height: 12),
            Text(
              "Call ${widget.driver.name}",
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            Text(
              widget.driver.phone,
              style: TextStyle(fontSize: 16, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text("Cancel"),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text("Simulating call to ${widget.driver.phone}..."),
                          backgroundColor: Colors.green,
                        ),
                      );
                    },
                    icon: const Icon(Icons.call),
                    label: const Text("Dial"),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showChatBottomSheet() {
    final TextEditingController textCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: SizedBox(
                height: 400,
                child: Column(
                  children: [
                    Row(
                      children: [
                        DriverAvatar(driver: widget.driver, radius: 20),
                        const SizedBox(width: 10),
                        Text(
                          "Chat with ${widget.driver.name}",
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                    const Divider(),
                    // Quick pre-made replies
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _quickReplyChip("I'm waiting at the gate", textCtrl),
                          _quickReplyChip("On my way down", textCtrl),
                          _quickReplyChip("Where are you?", textCtrl),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    // Messages list
                    Expanded(
                      child: ListView.builder(
                        itemCount: _chatMessages.length,
                        itemBuilder: (c, i) {
                          final msg = _chatMessages[i];
                          final isUser = msg["sender"] == "user";
                          return Align(
                            alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.symmetric(vertical: 4),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isUser ? Colors.blue : Colors.grey.shade200,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Text(
                                msg["text"]!,
                                style: TextStyle(
                                  color: isUser ? Colors.white : Colors.black87,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    // Input row
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: textCtrl,
                            decoration: const InputDecoration(
                              hintText: "Type a message...",
                              border: OutlineInputBorder(),
                              contentPadding: EdgeInsets.symmetric(horizontal: 12),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.send, color: Colors.blue),
                          onPressed: () {
                            if (textCtrl.text.trim().isNotEmpty) {
                              setModalState(() {
                                _chatMessages.add({
                                  "sender": "user",
                                  "text": textCtrl.text.trim(),
                                });
                              });
                              textCtrl.clear();
                            }
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _quickReplyChip(String text, TextEditingController ctrl) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ActionChip(
        label: Text(text, style: const TextStyle(fontSize: 12)),
        onPressed: () {
          setState(() {
            _chatMessages.add({"sender": "user", "text": text});
          });
        },
      ),
    );
  }

  void _showCancelDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Cancel this Ride?"),
        content: const Text(
          "Are you sure you want to cancel? No cancellation fee applies within the first 5 minutes of booking.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Keep Ride"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(ctx); // close dialog
              Navigator.popUntil(context, (route) => route.isFirst); // back to home
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text("Ride has been cancelled."),
                  backgroundColor: Colors.redAccent,
                ),
              );
            },
            child: const Text("Yes, Cancel"),
          ),
        ],
      ),
    );
  }

  void _showSosDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.red.shade50,
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.red, size: 30),
            SizedBox(width: 8),
            Text("Emergency SOS", style: TextStyle(color: Colors.red)),
          ],
        ),
        content: const Text(
          "Pressing emergency will instantly alert your emergency contacts with your live GPS location and notify local emergency services (112).",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Dismiss"),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text("🚨 SOS Triggered! Emergency authorities notified."),
                  backgroundColor: Colors.red,
                  duration: Duration(seconds: 4),
                ),
              );
            },
            icon: const Icon(Icons.shield),
            label: const Text("TRIGGER SOS NOW"),
          ),
        ],
      ),
    );
  }

  // ─── Build UI ─────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F9FC),
      appBar: AppBar(
        title: const Text("Live Ride Tracking"),
        backgroundColor: Colors.blue,
        actions: [
          // Notification Bell with Badge
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                tooltip: "Activity & Notifications",
                icon: const Icon(Icons.notifications_none_rounded),
                onPressed: () => NotificationsSheet.show(context),
              ),
              Positioned(
                right: 8,
                top: 8,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Colors.amber,
                    shape: BoxShape.circle,
                  ),
                  child: const Text(
                    "3",
                    style: TextStyle(
                      color: Colors.black,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
          IconButton(
            tooltip: "Family Safety Shield",
            icon: const Icon(Icons.family_restroom, color: Colors.amber),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const FamilyMonitoringScreen(),
                ),
              );
            },
          ),
          // Emergency SOS Button in header
          IconButton(
            tooltip: "Emergency SOS",
            icon: const Icon(Icons.emergency, color: Colors.redAccent),
            onPressed: _showSosDialog,
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // ── 1. Real Interactive Map with Polyline & Markers ─────────────
            _buildInteractiveMapArea(),

            // ── Dynamic Distance & ETA Summary Card ─────────────────────────
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "DISTANCE",
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _dynamicDistance,
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black87),
                      ),
                    ],
                  ),
                  Container(width: 1, height: 28, color: Colors.grey.shade300),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "DYNAMIC ETA",
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _dynamicEta,
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.blue),
                      ),
                    ],
                  ),
                  Container(width: 1, height: 28, color: Colors.grey.shade300),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "TRAFFIC",
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
                      ),
                      SizedBox(height: 2),
                      Text(
                        "Smooth • Green",
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.green),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // ── 2. Telemetry Stage Simulator ──────────────────────────────
            _buildTelemetryStageSwitcher(),

            // ── 3. Ride Status & OTP Banner ─────────────────────────────────
            _buildStatusAndOtpBanner(),

            // ── 4. Driver Profile & Vehicle Card ────────────────────────────
            _buildDriverCard(),

            // ── 5. Action Buttons (Call, Chat, SOS, Cancel) ─────────────────
            _buildActionButtonsRow(),

            // ── 6. Family Safety Shield In-Ride Telemetry Banner ────────────
            _buildFamilyShieldBanner(),

            // ── 7. Trip Details Card ────────────────────────────────────────
            _buildTripDetailsCard(),

            const SizedBox(height: 25),
          ],
        ),
      ),
    );
  }

  Widget _mapFloatingButton(IconData icon, VoidCallback onTap, String tooltip) {
    return Material(
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      elevation: 4,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Icon(icon, size: 20, color: Colors.blue.shade900),
        ),
      ),
    );
  }

  // ─── Real Interactive Map Widget (OpenStreetMap / FlutterMap) ─────────────
  Widget _buildInteractiveMapArea() {
    return AnimatedBuilder(
      animation: _carProgressAnimation,
      builder: (context, child) {
        final driverPos = _currentDriverLocation;

        return SizedBox(
          height: 290,
          width: double.infinity,
          child: Stack(
            children: [
              FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: const LatLng(17.4410, 78.3810),
                  initialZoom: _zoomLevel,
                  minZoom: 10.0,
                  maxZoom: 18.0,
                ),
                children: [
                  TileLayer(
                    urlTemplate: _isDarkMap
                        ? 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png'
                        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.chauffiq.frontend',
                  ),
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: _routeCoordinates,
                        strokeWidth: 5.5,
                        color: const Color(0xFF1D4ED8),
                      ),
                    ],
                  ),
                  MarkerLayer(
                    markers: [
                      // Pickup Pin Marker
                      Marker(
                        point: _pickupLocation,
                        width: 70,
                        height: 60,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.green.shade800,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                "Pickup",
                                style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const Icon(Icons.location_on, color: Colors.green, size: 30),
                          ],
                        ),
                      ),

                      // Destination Pin Marker
                      Marker(
                        point: _dropLocation,
                        width: 70,
                        height: 60,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.red.shade800,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                "Drop",
                                style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const Icon(Icons.flag_rounded, color: Colors.red, size: 28),
                          ],
                        ),
                      ),

                      // Animated Driver Vehicle Marker
                      Marker(
                        point: driverPos,
                        width: 80,
                        height: 70,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.blue.shade900,
                                borderRadius: BorderRadius.circular(6),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.3),
                                    blurRadius: 4,
                                  ),
                                ],
                              ),
                              child: Text(
                                widget.driver.name.split(" ").first,
                                style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.blue, width: 2),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.blue.withValues(alpha: 0.35),
                                    blurRadius: 8,
                                    spreadRadius: 2,
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.directions_car_filled,
                                color: Colors.blue,
                                size: 20,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              // Dynamic Floating ETA Badge on Map
              Positioned(
                top: 14,
                left: 14,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.18),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: _currentStage == RideStage.tripCompleted ? Colors.blue : Colors.green,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _currentStage == RideStage.tripCompleted
                            ? "Trip Completed"
                            : "ETA: $_dynamicEta • $_dynamicDistance",
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5),
                      ),
                    ],
                  ),
                ),
              ),

              // Interactive Floating Map Controls
              Positioned(
                right: 14,
                bottom: 14,
                child: Column(
                  children: [
                    _mapFloatingButton(Icons.add, _zoomIn, "Zoom In"),
                    const SizedBox(height: 6),
                    _mapFloatingButton(Icons.remove, _zoomOut, "Zoom Out"),
                    const SizedBox(height: 6),
                    _mapFloatingButton(Icons.my_location, _recenterMap, "Recenter Driver"),
                    const SizedBox(height: 6),
                    _mapFloatingButton(
                      _isDarkMap ? Icons.wb_sunny_outlined : Icons.dark_mode_outlined,
                      () => setState(() => _isDarkMap = !_isDarkMap),
                      "Toggle Dark Mode",
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // ─── Telemetry Stage Simulator ────────────────────────────────────────
  Widget _buildTelemetryStageSwitcher() {
    return Container(
      width: double.infinity,
      color: Colors.blue.shade50,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Row(
            children: [
              Icon(Icons.smart_toy_outlined, size: 18, color: Colors.blue),
              SizedBox(width: 6),
              Text(
                "Telemetry Simulation:",
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.blue),
              ),
            ],
          ),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              visualDensity: VisualDensity.compact,
              side: const BorderSide(color: Colors.blue),
            ),
            onPressed: _advanceToNextStage,
            icon: const Icon(Icons.skip_next, size: 16),
            label: const Text("Next Stage ▶", style: TextStyle(fontSize: 12)),
          ),
        ],
      ),
    );
  }

  // ─── Status & OTP Banner ─────────────────────────────────────────────────
  Widget _buildStatusAndOtpBanner() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _stageColor.withValues(alpha: 0.3), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _stageColor.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(
              _currentStage == RideStage.tripCompleted
                  ? Icons.check_circle
                  : Icons.near_me,
              color: _stageColor,
              size: 28,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _stageTitle,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: _stageColor,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  _stageSubtitle,
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
                ),
              ],
            ),
          ),
          // OTP Badge
          if (_currentStage != RideStage.tripCompleted)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.amber.shade100,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.amber.shade700),
              ),
              child: Column(
                children: [
                  const Text(
                    "PIN",
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54),
                  ),
                  Text(
                    _rideOtp,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Colors.amber.shade900,
                      letterSpacing: 1.5,
                    ),
                  ),
                ],
              ),
            )
          else
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(
                    builder: (_) => RatingReviewScreen(
                      driver: widget.driver,
                      fare: widget.driver.fare,
                      rideId: widget.rideId,
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.star, size: 18),
              label: const Text("Rate Driver", style: TextStyle(fontWeight: FontWeight.bold)),
            ),
        ],
      ),
    );
  }

  // ─── Driver Card ──────────────────────────────────────────────────────────
  Widget _buildDriverCard() {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            DriverAvatar(driver: widget.driver, radius: 32),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.driver.name,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.star, color: Colors.amber, size: 16),
                      const SizedBox(width: 4),
                      Text(
                        "${widget.driver.rating}",
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        "• ${widget.driver.vehicleType}",
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  // License Plate Container
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.yellow.shade100,
                      border: Border.all(color: Colors.black54),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      widget.driver.vehicleNumber,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        letterSpacing: 1.1,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Action Buttons Row ───────────────────────────────────────────────────
  Widget _buildActionButtonsRow() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _actionCircle(
            icon: Icons.call,
            label: "Call",
            color: Colors.green,
            onTap: _showCallDialog,
          ),
          _actionCircle(
            icon: Icons.chat,
            label: "Chat",
            color: Colors.blue,
            onTap: _showChatBottomSheet,
          ),
          _actionCircle(
            icon: Icons.shield_outlined,
            label: "SOS",
            color: Colors.red,
            onTap: _showSosDialog,
          ),
          _actionCircle(
            icon: Icons.cancel_outlined,
            label: "Cancel",
            color: Colors.grey.shade700,
            onTap: _showCancelDialog,
          ),
        ],
      ),
    );
  }

  Widget _actionCircle({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(30),
          child: Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 26),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Colors.grey.shade800,
          ),
        ),
      ],
    );
  }

  // ─── Family Safety Shield In-Ride Radar Banner ────────────────────────────
  Widget _buildFamilyShieldBanner() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A), // Dark luxury slate
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const FamilyMonitoringScreen()),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.amber.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.family_restroom, color: Colors.amber, size: 20),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            "Family Safety Shield Active",
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                          SizedBox(width: 6),
                          Icon(Icons.check_circle, color: Colors.greenAccent, size: 14),
                        ],
                      ),
                      SizedBox(height: 2),
                      Text(
                        "0% corridor deviation • Real-time GPS shared with family circle",
                        style: TextStyle(color: Colors.white70, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: Colors.amber, size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ─── Trip Details Card ────────────────────────────────────────────────────
  Widget _buildTripDetailsCard() {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Trip Summary",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            // Pickup Row
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.radio_button_checked, color: Colors.green, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Pickup Location",
                        style: TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                      Text(
                        widget.pickup.isNotEmpty ? widget.pickup : "Current Location",
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            // Vertical connecting line
            Container(
              margin: const EdgeInsets.only(left: 9),
              height: 22,
              width: 2,
              color: Colors.grey.shade300,
            ),

            // Drop Row
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.location_on, color: Colors.red, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Destination",
                        style: TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                      Text(
                        widget.drop.isNotEmpty ? widget.drop : "Destination Address",
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const Divider(height: 28),

            // Fare & Payment mode
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.payments_outlined, color: Colors.blue, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      "Cash / UPI on arrival",
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
                    ),
                  ],
                ),
                Text(
                  "₹${widget.driver.fare}",
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
