import 'package:flutter/material.dart';
import '../data/driver_database.dart';
import '../models/driver.dart';
import 'home_screen.dart';
import 'drivers_screen.dart';
import 'driver_details_screen.dart';
import 'ride_tracking_screen.dart';
import 'rating_review_screen.dart';
import 'driver_dashboard_screen.dart';
import 'driver_earnings_screen.dart';
import 'profile_screen.dart';
import 'login_screen.dart';
import 'family_monitoring_screen.dart';
import 'vehicle_assistance_screen.dart';
import 'driver_intelligence_screen.dart';
import 'ride_history_screen.dart';
import 'driver_registration_screen.dart';
import 'driver_documents_screen.dart';
import 'wallet_screen.dart';
import 'main_navigation_screen.dart';
import 'notifications_sheet.dart';

class PresentationDemoScreen extends StatefulWidget {
  const PresentationDemoScreen({super.key});

  @override
  State<PresentationDemoScreen> createState() => _PresentationDemoScreenState();
}

class _PresentationDemoScreenState extends State<PresentationDemoScreen> {
  // Default sample driver for command center preview
  Driver get _sampleDriver {
    if (DriverDatabase.drivers.isNotEmpty) {
      return DriverDatabase.drivers.first;
    }
    return Driver(
      name: "Rahul Sharma",
      phone: "+91 98765 43210",
      vehicleType: "BMW",
      vehicleNumber: "AP16FF4912",
      rating: 4.8,
      eta: "4 min",
      fare: 650,
    );
  }

  // ── ChauffiQ Smart Mobility Suite List ──────────────────────────────────────────
  final List<Map<String, dynamic>> _innovationFeatures = [
    {
      "title": "1. Smart Chauffeur Match",
      "subtitle": "Telematics, driving smoothness & affinity match (96% match)",
      "badge": "AI MATCH",
      "icon": Icons.auto_awesome,
      "color": Colors.purpleAccent,
      "screenBuilder": (Driver d) => DriversScreen(
            userName: "Vikram Sharma",
            pickup: "Hitech City Metro",
            drop: "Inorbit Mall",
            vehicle: "Car",
          ),
      "talkingPoints": [
        "Analyzes 12+ real-time telemetry parameters (smooth braking, punctuality, repeat ratings).",
        "Transparent reason badges: 'Top Rated for Luxury • 98% Punctual'.",
        "Goes beyond basic distance-only dispatch used by legacy aggregators.",
      ],
    },
    {
      "title": "2. Voice Concierge",
      "subtitle": "Natural voice recognition for hands-free regional booking",
      "badge": "VOICE CONCIERGE",
      "icon": Icons.mic,
      "color": Colors.redAccent,
      "screenBuilder": (Driver d) => const HomeScreen(),
      "talkingPoints": [
        "Interactive regional speech simulator chips (Hindi / English / Telugu).",
        "Extracts pickup, destination, and vehicle type in a single spoken phrase.",
        "Solves typing barriers for tier-2/3 commuters and hands-free scenarios.",
      ],
    },
    {
      "title": "3. Family Safety Shield & Live Telemetry",
      "subtitle": "Guardian live telemetry, speed radar & corridor deviation alerts",
      "badge": "FAMILY SHIELD",
      "icon": Icons.family_restroom,
      "color": Colors.greenAccent,
      "screenBuilder": (Driver d) => const FamilyMonitoringScreen(),
      "talkingPoints": [
        "Real-time speed telemetry (42 km/h) & 0% corridor geofence deviation.",
        "Remote 1-tap SOS alert dispatch & direct chauffeur call for worried parents.",
        "Multi-member Family Circle with geofence entry/exit pings.",
      ],
    },
    {
      "title": "4. Senior Citizen Accessible Mode",
      "subtitle": "High-contrast UI, 56dp+ touch targets & priority voice dispatch",
      "badge": "ACCESSIBILITY",
      "icon": Icons.elderly,
      "color": Colors.amberAccent,
      "screenBuilder": (Driver d) => const ProfileScreen(),
      "talkingPoints": [
        "High-contrast color themes for vision-impaired senior citizens.",
        "Enlarged buttons and tap areas (minimum 56dp) to prevent accidental mis-clicks.",
        "Priority voice guidance and auto-SOS emergency fall/alert triggers.",
      ],
    },
    {
      "title": "5. Favorite Drivers & Recurring Commutes",
      "subtitle": "Saved trusted chauffeurs & automated office commute schedules",
      "badge": "RECURRING",
      "icon": Icons.favorite,
      "color": Colors.pinkAccent,
      "screenBuilder": (Driver d) => DriverDetailsScreen(
            userName: "Vikram Sharma",
            pickup: "Hitech City Metro",
            drop: "Inorbit Mall",
            vehicle: "Car",
            driver: d,
          ),
      "talkingPoints": [
        "Single-tap heart icon to save verified chauffeurs into Personal Circle.",
        "Automated scheduler for Daily Office Commutes & Weekend Outstation trips.",
        "Eliminates awkward unverified offline hiring with secure digital contracts.",
      ],
    },
    {
      "title": "6. Vehicle Vault & Maintenance Radar",
      "subtitle": "Insurance & PUC countdowns + Doorstep mechanic booking",
      "badge": "VEHICLE VAULT",
      "icon": Icons.car_repair,
      "color": Colors.orangeAccent,
      "screenBuilder": (Driver d) => const VehicleAssistanceScreen(),
      "talkingPoints": [
        "15-day Insurance renewal countdown with direct online renewal CTA.",
        "30-day Pollution Certificate (PUC) radar & nearest test center locator.",
        "Periodic service tracking with 1-tap doorstep certified mechanic dispatch.",
      ],
    },
    {
      "title": "7. Driver Performance Intelligence",
      "subtitle": "Driver IQ Score (94/100) & AI driving behavior coaching",
      "badge": "DRIVER IQ",
      "icon": Icons.psychology_outlined,
      "color": Colors.cyanAccent,
      "screenBuilder": (Driver d) => const DriverIntelligenceScreen(),
      "talkingPoints": [
        "Comprehensive 94/100 IQ score: Punctuality (98%), Braking (96%), Zero Cancellations.",
        "Actionable AI coaching tips to help driver-partners maximize monthly bonuses.",
        "Drives passenger safety by incentivizing smooth, respectful driving.",
      ],
    },
  ];

  // ── Core Full Journey Flow ───────────────────────────────────────────────────
  final List<Map<String, dynamic>> _coreJourney = [
    {
      "title": "1. Authentication & OTP",
      "subtitle": "Phone login with 4-digit verification",
      "icon": Icons.lock_outline,
      "color": Colors.blue,
      "screenBuilder": (Driver d) => const LoginScreen(),
      "talkingPoints": [
        "Pre-filled OTP (4821) for instantaneous evaluator testing.",
        "Clean phone input with Indian country code (+91).",
        "Social login integration endpoints.",
      ],
    },
    {
      "title": "2. Rider Booking Hub",
      "subtitle": "Trip search, pickup, drop & vehicle selector",
      "icon": Icons.search,
      "color": Colors.indigo,
      "screenBuilder": (Driver d) => const HomeScreen(),
      "talkingPoints": [
        "Intuitive one-screen ride discovery with quick class pills.",
        "Voice booking trigger & quick links to Family Shield & Vehicle Vault.",
        "Instant access to My Rides, Profile, and Driver Mode.",
      ],
    },
    {
      "title": "3. Available Drivers",
      "subtitle": "Real-time list with AI badges and live ETAs",
      "icon": Icons.people_outline,
      "color": Colors.teal,
      "screenBuilder": (Driver d) => DriversScreen(
            userName: "Vikram Sharma",
            pickup: "Hitech City Metro",
            drop: "Inorbit Mall",
            vehicle: "Car",
          ),
      "talkingPoints": [
        "AI Best Match badges and verified driver photos.",
        "Transparent fares, vehicle specs, and live arrival times.",
        "Filter chips for AI Match, Sedan, and Economy.",
      ],
    },
    {
      "title": "4. Driver Profile & Verification",
      "subtitle": "Detailed credentials before booking confirmation",
      "icon": Icons.assignment_outlined,
      "color": Colors.deepPurple,
      "screenBuilder": (Driver d) => DriverDetailsScreen(
            userName: "Vikram Sharma",
            pickup: "Hitech City Metro",
            drop: "Inorbit Mall",
            vehicle: "Car",
            driver: d,
          ),
      "talkingPoints": [
        "High-resolution driver photo, badge, and ratings count.",
        "Favorite driver bookmarking & Recurring Commute modal.",
        "Instant one-click ride confirmation.",
      ],
    },
    {
      "title": "5. Real Map Tracking & Dynamic ETAs",
      "subtitle": "Interactive OpenStreetMap, route polyline, GPS markers & zoom controls",
      "icon": Icons.navigation_outlined,
      "color": Colors.green,
      "screenBuilder": (Driver d) => RideTrackingScreen(
            userName: "Vikram Sharma",
            pickup: "Hitech City Metro",
            drop: "Inorbit Mall",
            vehicle: "Car",
            driver: d,
          ),
      "talkingPoints": [
        "Real OpenStreetMap tiles with zero API key failures or billing limits.",
        "Real GPS markers: Pickup, Drop, and animated Driver vehicle.",
        "Interactive Zoom In (+), Zoom Out (-), and Recenter location controls.",
        "Dynamic \$eta and \$distance summary cards ready for backend binding.",
      ],
    },
    {
      "title": "6. Rating & Driver Tip",
      "subtitle": "5-star feedback, compliments, and tipping",
      "icon": Icons.star_outline,
      "color": Colors.amber,
      "screenBuilder": (Driver d) => RatingReviewScreen(
            driver: d,
            fare: d.fare,
          ),
      "talkingPoints": [
        "Interactive 1-5 star selector with dynamic sentiment labels.",
        "Multi-select compliment tags (Clean Car, Polite, On Time).",
        "Optional driver tipping (₹20, ₹50, ₹100).",
      ],
    },
    {
      "title": "7. Driver Partner Dashboard",
      "subtitle": "Online switch & incoming ride requests",
      "icon": Icons.dashboard_outlined,
      "color": Colors.orange,
      "screenBuilder": (Driver d) => const DriverDashboardScreen(),
      "talkingPoints": [
        "Online/Offline status toggle switch.",
        "Incoming ride modal with 15-second countdown timer.",
        "Multi-step ride execution (Pickup ➡️ Start ➡️ Complete).",
        "Driver IQ score card embedded at top.",
      ],
    },
    {
      "title": "8. Driver Earnings & Analytics",
      "subtitle": "Weekly trend bar chart & instant cashout",
      "icon": Icons.analytics_outlined,
      "color": Colors.cyan,
      "screenBuilder": (Driver d) => const DriverEarningsScreen(),
      "talkingPoints": [
        "Gross weekly earnings with 7-day bar chart visualization.",
        "Instant bank cashout dialog with linked account.",
        "Key performance indicators (Rating, Acceptance Rate).",
      ],
    },
    {
      "title": "9. Safety Profile & Wallet",
      "subtitle": "Emergency contacts, wallet balance, and preferences",
      "icon": Icons.shield_outlined,
      "color": Colors.redAccent,
      "screenBuilder": (Driver d) => const ProfileScreen(),
      "talkingPoints": [
        "Trusted Emergency Contacts modal with instant dial.",
        "ChauffiQ Wallet balance & Saved Places (Home/Work).",
        "Senior Citizen Mode toggle and Dedicated Drivers list.",
      ],
    },
    {
      "title": "10. Ride History & Digital Receipts",
      "subtitle": "Past trips, route breadcrumbs & invoices",
      "icon": Icons.receipt_long_outlined,
      "color": Colors.blueGrey,
      "screenBuilder": (Driver d) => const RideHistoryScreen(),
      "talkingPoints": [
        "Past and upcoming trip tabs.",
        "Full route breadcrumbs and payment method badges.",
        "Digital tax invoice download & receipt viewer.",
      ],
    },
    {
      "title": "11. Driver Partner Onboarding",
      "subtitle": "Driver registration with photo & vehicle capture",
      "icon": Icons.person_add_alt_1_outlined,
      "color": Colors.tealAccent,
      "screenBuilder": (Driver d) => const DriverRegistrationScreen(),
      "talkingPoints": [
        "Cross-platform image picking (Web & Mobile).",
        "Immediate local validation and live list synchronization.",
        "Clean form inputs with license and vehicle plate verification.",
      ],
    },
    {
      "title": "12. Chauffeur Document Verification",
      "subtitle": "Commercial DL, Aadhaar, RC & Insurance upload with preview",
      "icon": Icons.verified_user_outlined,
      "color": Colors.amberAccent,
      "screenBuilder": (Driver d) => const DriverDocumentsScreen(),
      "talkingPoints": [
        "Mandatory regulatory transport compliance and identity verification.",
        "Cross-platform file upload and preview dialogs for DL, Aadhaar, RC, and Insurance.",
        "Verification pipeline with status badges (Approved, Under Review, Action Required).",
      ],
    },
    {
      "title": "13. Commercial 5-Tab Navigation Hub",
      "subtitle": "Uber/Ola persistent Bottom Navigation Shell",
      "icon": Icons.tab_outlined,
      "color": Colors.indigoAccent,
      "screenBuilder": (Driver d) => const MainNavigationScreen(),
      "talkingPoints": [
        "Persistent 5-tab NavigationBar (Home, My Trips, Driver Mode, Wallet, Profile).",
        "Map-first commercial dashboard with live animated nearby chauffeurs.",
        "Matches industry production mobility application architecture.",
      ],
    },
    {
      "title": "14. ChauffiQ Digital Wallet",
      "subtitle": "Balance, 1-tap quick recharges & transaction history",
      "icon": Icons.account_balance_wallet_outlined,
      "color": Colors.greenAccent,
      "screenBuilder": (Driver d) => const WalletScreen(),
      "talkingPoints": [
        "Gold Commuter balance display (₹1,450) with RBI-compliant simulation.",
        "1-tap quick recharge pills (+₹500, +₹1,000, +₹2,000).",
        "Detailed ride payment deductions and cashback reward history.",
      ],
    },
  ];

  void _openScreen(Widget target) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => target),
    );
  }

  @override
  Widget build(BuildContext context) {
    final driver = _sampleDriver;

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: const Color(0xFF0F172A), // Midnight Navy
        appBar: AppBar(
          title: const Row(
            children: [
              Icon(Icons.dashboard_customize_rounded, color: Colors.amber),
              SizedBox(width: 8),
              Text(
                "ChauffiQ Command Center",
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
            ],
          ),
          backgroundColor: const Color(0xFF1E293B),
          actions: [
            IconButton(
              icon: const Icon(Icons.notifications_none_rounded, color: Colors.amber),
              tooltip: "Notification Center",
              onPressed: () => NotificationsSheet.show(context),
            ),
          ],
          bottom: const TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            indicatorColor: Colors.amber,
            labelColor: Colors.amber,
            unselectedLabelColor: Colors.white70,
            tabs: [
              Tab(
                icon: Icon(Icons.auto_awesome, size: 18),
                text: "Smart Mobility Suite",
              ),
              Tab(
                icon: Icon(Icons.route, size: 18),
                text: "Customer Journey",
              ),
              Tab(
                icon: Icon(Icons.compare_arrows, size: 18),
                text: "Market Comparison",
              ),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            // ── Tab 1: Smart Mobility Suite ────────────────────────────
            _buildCardsList(
              context: context,
              items: _innovationFeatures,
              driver: driver,
              headerTitle: "ChauffiQ Smart Mobility Suite",
              headerSubtitle:
                  "Proprietary intelligence & safety modules elevating ChauffiQ above legacy driver platforms.",
            ),

            // ── Tab 2: Customer Journey ─────────────────────────
            _buildCardsList(
              context: context,
              items: _coreJourney,
              driver: driver,
              headerTitle: "Customer & Driver Lifecycle",
              headerSubtitle:
                  "14 integrated production modules powering the entire commercial ride lifecycle.",
            ),

            // ── Tab 3: Market Comparison ─────────────────────────
            _buildCompetitiveMatrix(),
          ],
        ),
      ),
    );
  }

  Widget _buildCardsList({
    required BuildContext context,
    required List<Map<String, dynamic>> items,
    required Driver driver,
    required String headerTitle,
    required String headerSubtitle,
  }) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Banner
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.blue.shade900, Colors.indigo.shade800],
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.blue.withValues(alpha: 0.3),
                  blurRadius: 16,
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      headerTitle,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.amber,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        "PRO",
                        style: TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.w900,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  headerSubtitle,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.8),
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.amber,
                          foregroundColor: Colors.black87,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        onPressed: () => _openScreen(const HomeScreen()),
                        icon: const Icon(Icons.home, size: 18),
                        label: const Text(
                          "Rider Home",
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: const BorderSide(color: Colors.white54),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        onPressed: () =>
                            _openScreen(const DriverDashboardScreen()),
                        icon: const Icon(Icons.dashboard, size: 18),
                        label: const Text(
                          "Driver Hub",
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Cards
          ...items.map((item) {
            final Color color = item["color"] as Color;
            final String title = item["title"] as String;
            final String subtitle = item["subtitle"] as String;
            final IconData icon = item["icon"] as IconData;
            final List<String> points = item["talkingPoints"] as List<String>;
            final Widget Function(Driver) builder =
                item["screenBuilder"] as Widget Function(Driver);

            return Card(
              color: const Color(0xFF1E293B),
              margin: const EdgeInsets.only(bottom: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: color.withValues(alpha: 0.35)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(icon, color: color, size: 24),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      title,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  if (item["badge"] != null)
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: color.withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(color: color),
                                      ),
                                      child: Text(
                                        item["badge"] as String,
                                        style: TextStyle(
                                          color: color,
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                subtitle,
                                style: TextStyle(
                                  color: Colors.grey.shade400,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    // Talking Points
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.25),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "💡 Feature Highlights:",
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: color,
                            ),
                          ),
                          const SizedBox(height: 4),
                          ...points.map((p) => Padding(
                                padding: const EdgeInsets.only(bottom: 2),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text("• ",
                                        style: TextStyle(
                                            color: Colors.grey.shade400,
                                            fontSize: 12)),
                                    Expanded(
                                      child: Text(
                                        p,
                                        style: TextStyle(
                                          color: Colors.grey.shade300,
                                          fontSize: 11.5,
                                          height: 1.3,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              )),
                        ],
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Action Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: color.withValues(alpha: 0.85),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                        onPressed: () => _openScreen(builder(driver)),
                        icon: const Icon(Icons.arrow_forward, size: 16),
                        label: const Text(
                          "Explore Module ▶",
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  // ── Tab 3: Competitive Advantage Matrix ─────────────────────────────────────
  Widget _buildCompetitiveMatrix() {
    final List<Map<String, String>> matrix = [
      {
        "feature": "1. Smart Chauffeur Match",
        "driveu": "Nearest driver proximity only (basic distance)",
        "chauffiq": "🤖 Smart Chauffeur Match: Driving telematics, smoothness & punctuality scoring (96% match)",
      },
      {
        "feature": "2. Voice Concierge",
        "driveu": "❌ None. Requires manual text typing",
        "chauffiq": "🎤 Voice Concierge: Hands-free regional booking with 1-phrase route extraction",
      },
      {
        "feature": "3. Family Safety",
        "driveu": "Passive SMS location share link",
        "chauffiq": "👨‍👩‍👧 Live Family Shield: Corridor deviation radar, speed alert & remote guardian SOS",
      },
      {
        "feature": "4. Senior Citizen Mode",
        "driveu": "❌ None. Standard complex mobile layout",
        "chauffiq": "👴 High-contrast theme, jumbo 56dp+ buttons & prioritized voice-assisted booking",
      },
      {
        "feature": "5. Favorite Chauffeurs",
        "driveu": "Random allocation on every booking",
        "chauffiq": "❤️ Dedicated Chauffeur Circle + automated Recurring Commute scheduling",
      },
      {
        "feature": "6. Car Maintenance Care",
        "driveu": "❌ Ride-only. Zero vehicle management",
        "chauffiq": "🔔 Vehicle Vault: Insurance & PUC expiry alerts + Doorstep mechanic booking",
      },
      {
        "feature": "7. Driver Growth & Ethics",
        "driveu": "Simple 1-5 star rating and punitive bans",
        "chauffiq": "📊 Driver IQ Score (94/100) + AI coaching tips rewarding safe, smooth chauffeurs",
      },
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.purple.shade900, Colors.indigo.shade900],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Market Comparison: ChauffiQ vs Legacy Aggregators",
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 6),
                Text(
                  "How ChauffiQ elevates beyond traditional driver aggregators with AI telematics, active safety, and vehicle lifecycle care.",
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          ...matrix.map((row) {
            return Card(
              color: const Color(0xFF1E293B),
              margin: const EdgeInsets.only(bottom: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      row["feature"]!,
                      style: const TextStyle(
                        color: Colors.amber,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.cancel, color: Colors.redAccent, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              "Legacy Aggregators (DriveU): ${row['driveu']!}",
                              style: TextStyle(
                                color: Colors.red.shade200,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.green.withValues(alpha: 0.4)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.check_circle, color: Colors.greenAccent, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              "ChauffiQ Advantage: ${row['chauffiq']!}",
                              style: const TextStyle(
                                color: Colors.greenAccent,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
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
          }),
        ],
      ),
    );
  }
}
