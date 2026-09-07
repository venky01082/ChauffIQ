import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'drivers_screen.dart';
import 'driver_registration_screen.dart';
import 'driver_dashboard_screen.dart';
import 'presentation_demo_screen.dart';
import 'family_monitoring_screen.dart';
import 'notifications_sheet.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  final TextEditingController nameController = TextEditingController(text: "Vikram Sharma");
  final TextEditingController pickupController =
      TextEditingController(text: "Hitech City Metro Station");
  final TextEditingController dropController =
      TextEditingController(text: "Inorbit Mall, Madhapur");

  String vehicleType = "Economy";
  bool _isDarkMap = false;

  // Map Controller & Coordinates (Hyderabad Hitech City)
  final MapController _mapController = MapController();
  double _zoomLevel = 14.5;
  static const LatLng _userLocation = LatLng(17.4474, 78.3762);

  // Animation controller for live driver wandering motion
  late AnimationController _driftController;
  late Animation<double> _driftAnimation;

  final List<Map<String, dynamic>> _quickDestinations = const [
    {
      "label": "Home",
      "icon": Icons.home_outlined,
      "address": "Flat 402, Green Meadows, Madhapur",
    },
    {
      "label": "Office",
      "icon": Icons.business_outlined,
      "address": "Cyber Gateway, Tower 3, Hitech City",
    },
    {
      "label": "Airport",
      "icon": Icons.flight_takeoff_outlined,
      "address": "Rajiv Gandhi Intl. Airport (RGIA)",
    },
    {
      "label": "Station",
      "icon": Icons.train_outlined,
      "address": "Secunderabad Railway Station",
    },
  ];

  final List<Map<String, dynamic>> _vehicleClasses = const [
    {"name": "Economy", "icon": Icons.directions_car_outlined, "rate": "₹350/hr"},
    {"name": "Premium", "icon": Icons.directions_car_filled_outlined, "rate": "₹450/hr"},
    {"name": "SUV", "icon": Icons.airport_shuttle_outlined, "rate": "₹650/hr"},
    {"name": "Outstation", "icon": Icons.commute_outlined, "rate": "₹850/hr"},
  ];

  @override
  void initState() {
    super.initState();
    _driftController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);

    _driftAnimation = Tween<double>(begin: -0.0006, end: 0.0006).animate(
      CurvedAnimation(parent: _driftController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _driftController.dispose();
    nameController.dispose();
    pickupController.dispose();
    dropController.dispose();
    super.dispose();
  }

  // ─── Voice-Based Booking Dialog ───────────────────────────────────────────
  void _showVoiceBookingDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.blue.shade200, width: 2),
              ),
              child: const Icon(Icons.mic, size: 48, color: Colors.blue),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.auto_awesome, size: 13, color: Colors.blue),
                  SizedBox(width: 4),
                  Text(
                    "Voice Concierge",
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              "Listening...",
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            Text(
              "Speak your destination or tap a sample command below:",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
            const SizedBox(height: 20),

            _voicePresetChip(
              ctx,
              "🗣️ \"Book a chauffeur to Hyderabad Airport in a Premium Sedan\"",
              "Hitech City Metro Station",
              "Rajiv Gandhi Intl. Airport (RGIA)",
              "Premium",
            ),
            const SizedBox(height: 8),
            _voicePresetChip(
              ctx,
              "🗣️ \"Take me to Inorbit Mall Madhapur\"",
              "Current Location",
              "Inorbit Mall, Madhapur",
              "Economy",
            ),
            const SizedBox(height: 8),
            _voicePresetChip(
              ctx,
              "🗣️ \"Go to Gachibowli Stadium in an SUV\"",
              "Residence, Kondapur",
              "Gachibowli Stadium",
              "SUV",
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _voicePresetChip(
    BuildContext ctx,
    String command,
    String pickup,
    String drop,
    String vType,
  ) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        style: OutlinedButton.styleFrom(
          alignment: Alignment.centerLeft,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          side: BorderSide(color: Colors.blue.shade300),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        onPressed: () {
          setState(() {
            pickupController.text = pickup;
            dropController.text = drop;
            vehicleType = vType;
          });
          Navigator.pop(ctx);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("Voice Command Processed: Destination set to $drop ($vType)"),
              backgroundColor: Colors.blue.shade900,
            ),
          );
        },
        child: Text(
          command,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.black87),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      // Quick Access Hub Floating Button
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: Colors.amber.shade600,
        foregroundColor: Colors.black87,
        elevation: 4,
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const PresentationDemoScreen(),
            ),
          );
        },
        icon: const Icon(Icons.dashboard_customize_outlined, size: 22),
        label: const Text(
          "Quick Access Hub",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
        ),
      ),
      body: Stack(
        children: [
          // ── 1. Interactive Map (65% Viewport) ─────────────────────────────
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: MediaQuery.of(context).size.height * 0.52,
            child: AnimatedBuilder(
              animation: _driftAnimation,
              builder: (context, child) {
                final drift = _driftAnimation.value;

                return FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: _userLocation,
                    initialZoom: _zoomLevel,
                    minZoom: 11.0,
                    maxZoom: 18.0,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: _isDarkMap
                          ? 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png'
                          : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.chauffiq.frontend',
                    ),
                    MarkerLayer(
                      markers: [
                        // User Current Pickup Marker (Green Pin)
                        Marker(
                          point: _userLocation,
                          width: 80,
                          height: 70,
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.green.shade800,
                                  borderRadius: BorderRadius.circular(6),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.2),
                                      blurRadius: 4,
                                    ),
                                  ],
                                ),
                                child: const Text(
                                  "You are here",
                                  style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                                ),
                              ),
                              const Icon(Icons.my_location, color: Colors.green, size: 28),
                            ],
                          ),
                        ),

                        // Driver 1: Rahul Sharma (AI Recommended Chauffeur)
                        Marker(
                          point: LatLng(17.4450 + drift, 78.3800 - drift),
                          width: 100,
                          height: 85,
                          child: _liveDriverPin("⭐ Rahul (96% AI)", Colors.amber.shade800, isBestMatch: true),
                        ),

                        // Driver 2: Ravi Kumar
                        Marker(
                          point: LatLng(17.4490 - drift * 0.8, 78.3730 + drift * 0.8),
                          width: 95,
                          height: 85,
                          child: _liveDriverPin("Ravi • 3m", Colors.blue.shade900),
                        ),

                        // Driver 3: Siddharth Verma (SUV)
                        Marker(
                          point: LatLng(17.4410 + drift * 0.5, 78.3850 + drift * 0.5),
                          width: 95,
                          height: 85,
                          child: _liveDriverPin("Siddharth • SUV", Colors.indigo.shade800),
                        ),

                        // Driver 4: Amit Patel
                        Marker(
                          point: LatLng(17.4520 - drift * 0.6, 78.3790 - drift * 0.6),
                          width: 95,
                          height: 85,
                          child: _liveDriverPin("Amit • 8m", Colors.blue.shade700),
                        ),
                      ],
                    ),
                  ],
                );
              },
            ),
          ),

          // ── 2. Floating Top Header & Action Controls ───────────────────────
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 16,
            right: 16,
            child: Row(
              children: [
                // Current Location Pill
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(30),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.12),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: Image.asset(
                            'assets/logo.jpg',
                            width: 24,
                            height: 24,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                const Icon(Icons.local_taxi, color: Colors.amber, size: 20),
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.location_pin, color: Colors.green, size: 18),
                        const SizedBox(width: 4),
                        const Expanded(
                          child: Text(
                            "Hitech City Metro ▾",
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Family Safety Shield Quick Radar Trigger
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: IconButton(
                    tooltip: "Family Safety Shield",
                    icon: const Icon(Icons.family_restroom, color: Colors.amber, size: 22),
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const FamilyMonitoringScreen(),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 6),

                // Notification Bell with Badge
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      IconButton(
                        tooltip: "Notifications",
                        icon: const Icon(Icons.notifications_none_rounded, color: Colors.black87),
                        onPressed: () => NotificationsSheet.show(context),
                      ),
                      Positioned(
                        right: 8,
                        top: 8,
                        child: Container(
                          padding: const EdgeInsets.all(3),
                          decoration: const BoxDecoration(
                            color: Colors.amber,
                            shape: BoxShape.circle,
                          ),
                          child: const Text(
                            "3",
                            style: TextStyle(
                              color: Colors.black,
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── Map Zoom & Recenter Floating Controls ─────────────────────────
          Positioned(
            right: 14,
            top: MediaQuery.of(context).size.height * 0.38,
            child: Column(
              children: [
                _floatingCircleBtn(Icons.add, () {
                  setState(() => _zoomLevel = (_zoomLevel + 1).clamp(11.0, 18.0));
                  _mapController.move(_userLocation, _zoomLevel);
                }),
                const SizedBox(height: 6),
                _floatingCircleBtn(Icons.remove, () {
                  setState(() => _zoomLevel = (_zoomLevel - 1).clamp(11.0, 18.0));
                  _mapController.move(_userLocation, _zoomLevel);
                }),
                const SizedBox(height: 6),
                _floatingCircleBtn(Icons.my_location, () {
                  _mapController.move(_userLocation, 15.0);
                }),
                const SizedBox(height: 6),
                _floatingCircleBtn(
                  _isDarkMap ? Icons.wb_sunny_outlined : Icons.dark_mode_outlined,
                  () => setState(() => _isDarkMap = !_isDarkMap),
                ),
              ],
            ),
          ),

          // ── 3. Bottom Commercial Booking Sheet (Ola / Uber Style) ─────────
          Positioned(
            top: MediaQuery.of(context).size.height * 0.48,
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(26)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.15),
                    blurRadius: 20,
                    offset: const Offset(0, -6),
                  ),
                ],
              ),
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(18, 12, 18, 90),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Sheet Drag Handle
                    Center(
                      child: Container(
                        width: 42,
                        height: 4.5,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Destination Search Bar with Mic
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: dropController,
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: Colors.grey.shade100,
                              hintText: "Where should your chauffeur take you?",
                              hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                              prefixIcon: const Icon(Icons.search, color: Colors.blue),
                              suffixIcon: IconButton(
                                icon: const Icon(Icons.mic, color: Colors.blue),
                                tooltip: "Voice Input",
                                onPressed: _showVoiceBookingDialog,
                              ),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                                borderSide: BorderSide.none,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // 1-Tap Quick Destination Shortcuts (Home, Office, Airport, Station)
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: _quickDestinations.map((dest) {
                          final label = dest["label"] as String;
                          final icon = dest["icon"] as IconData;
                          final address = dest["address"] as String;
                          final isSelected = dropController.text == address;

                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ActionChip(
                              avatar: Icon(
                                icon,
                                size: 16,
                                color: isSelected ? Colors.white : Colors.blue.shade800,
                              ),
                              label: Text(
                                label,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: isSelected ? Colors.white : Colors.black87,
                                ),
                              ),
                              backgroundColor: isSelected ? Colors.blue : Colors.grey.shade100,
                              side: BorderSide(
                                color: isSelected ? Colors.blue : Colors.grey.shade300,
                              ),
                              onPressed: () {
                                setState(() {
                                  dropController.text = address;
                                });
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text("Destination set to $label: $address"),
                                    duration: const Duration(seconds: 2),
                                    backgroundColor: Colors.blue.shade900,
                                  ),
                                );
                              },
                            ),
                          );
                        }).toList(),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Chauffeur Class Selector
                    const Text(
                      "Chauffeur Class",
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black87),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: _vehicleClasses.map((vc) {
                        final String name = vc["name"] as String;
                        final IconData icon = vc["icon"] as IconData;
                        final String rate = vc["rate"] as String;
                        final isSelected = vehicleType == name;

                        return Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 3),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(12),
                              onTap: () => setState(() => vehicleType = name),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
                                decoration: BoxDecoration(
                                  color: isSelected ? Colors.blue.shade50 : Colors.grey.shade100,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isSelected ? Colors.blue : Colors.grey.shade300,
                                    width: isSelected ? 1.8 : 1,
                                  ),
                                ),
                                child: Column(
                                  children: [
                                    Icon(
                                      icon,
                                      color: isSelected ? Colors.blue : Colors.grey.shade700,
                                      size: 22,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      name,
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                        color: isSelected ? Colors.blue.shade900 : Colors.black87,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      rate,
                                      style: TextStyle(
                                        fontSize: 9,
                                        color: isSelected ? Colors.blue.shade700 : Colors.grey.shade600,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),

                    const SizedBox(height: 14),

                    // AI Best Match Highlight Strip
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.amber.shade300),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.psychology, color: Colors.amber, size: 20),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "🤖 Smart Chauffeur Match: Rahul Sharma",
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                                Text(
                                  "96% Affinity • 9.8 Smoothness • 3 min away",
                                  style: TextStyle(fontSize: 10, color: Colors.black54),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.amber,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              "96%",
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Primary CTA: FIND CHAUFFEUR
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          foregroundColor: Colors.white,
                          elevation: 2,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        icon: const Icon(Icons.search),
                        label: const Text(
                          "FIND CHAUFFEUR",
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                        ),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => DriversScreen(
                                userName: nameController.text,
                                pickup: pickupController.text,
                                drop: dropController.text,
                                vehicle: vehicleType,
                              ),
                            ),
                          );
                        },
                      ),
                    ),

                    const SizedBox(height: 14),

                    // Secondary Quick Mode Shortcuts (Register & Driver Mode)
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            icon: const Icon(Icons.person_add_alt_1, size: 16),
                            label: const Text("Register Driver", style: TextStyle(fontSize: 12)),
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const DriverRegistrationScreen(),
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            icon: const Icon(Icons.local_taxi, size: 16),
                            label: const Text("Driver Mode", style: TextStyle(fontSize: 12)),
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const DriverDashboardScreen(),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _floatingCircleBtn(IconData icon, VoidCallback onTap) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: IconButton(
        padding: EdgeInsets.zero,
        icon: Icon(icon, size: 20, color: Colors.blue.shade900),
        onPressed: onTap,
      ),
    );
  }

  Widget _liveDriverPin(String label, Color color, {bool isBestMatch = false}) {
    return FittedBox(
      fit: BoxFit.scaleDown,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(6),
              border: isBestMatch ? Border.all(color: Colors.amber, width: 1.5) : null,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.25),
                  blurRadius: 4,
                ),
              ],
            ),
            child: Text(
              label,
              style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
            ),
          ),
          Container(
            padding: const EdgeInsets.all(4),
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.directions_car_filled, color: color, size: 22),
          ),
        ],
      ),
    );
  }
}