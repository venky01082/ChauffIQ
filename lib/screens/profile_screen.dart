import 'package:flutter/material.dart';
import 'login_screen.dart';
import 'vehicle_assistance_screen.dart';
import '../services/api_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isDarkMode = false;
  bool _shareLiveTrip = true;
  bool _seniorCitizenMode = false;
  String _selectedLanguage = "English";

  final List<String> _languages = ["English", "Hindi", "Telugu", "Kannada", "Tamil"];

  void _showEditProfileDialog() {
    final nameCtrl = TextEditingController(text: "Vikram Sharma");
    final phoneCtrl = TextEditingController(text: "+91 98765 43210");
    final emailCtrl = TextEditingController(text: "vikram.sharma@example.com");

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Edit Profile"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: "Full Name"),
            ),
            TextField(
              controller: phoneCtrl,
              decoration: const InputDecoration(labelText: "Phone Number"),
            ),
            TextField(
              controller: emailCtrl,
              decoration: const InputDecoration(labelText: "Email Address"),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final name = nameCtrl.text.trim();
              final phone = phoneCtrl.text.trim();
              try {
                await ApiService.syncUser(
                  name: name.isNotEmpty ? name : null,
                  phone: phone.isNotEmpty ? phone : null,
                );
              } catch (_) {}
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Profile details updated & synced.")),
                );
              }
            },
            child: const Text("Save"),
          ),
        ],
      ),
    );
  }

  void _showAddPlaceDialog() {
    final titleCtrl = TextEditingController();
    final addressCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Add Saved Place"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: titleCtrl,
              decoration: const InputDecoration(labelText: "Label (e.g. Gym, Clinic)"),
            ),
            TextField(
              controller: addressCtrl,
              decoration: const InputDecoration(labelText: "Full Address"),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Place saved to your profile.")),
              );
            },
            child: const Text("Save Place"),
          ),
        ],
      ),
    );
  }

  void _showEmergencyContactsDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.shield_outlined, color: Colors.red),
            SizedBox(width: 8),
            Text("Emergency Contacts"),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const CircleAvatar(
                backgroundColor: Colors.redAccent,
                child: Icon(Icons.person, color: Colors.white),
              ),
              title: const Text("Aarav Sharma (Brother)"),
              subtitle: const Text("+91 98111 22334"),
              trailing: IconButton(
                icon: const Icon(Icons.call, color: Colors.green),
                onPressed: () {},
              ),
            ),
            const Divider(),
            ListTile(
              leading: const CircleAvatar(
                backgroundColor: Colors.redAccent,
                child: Icon(Icons.person, color: Colors.white),
              ),
              title: const Text("Sunita Sharma (Mother)"),
              subtitle: const Text("+91 98222 33445"),
              trailing: IconButton(
                icon: const Icon(Icons.call, color: Colors.green),
                onPressed: () {},
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Close"),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Add contact option simulated.")),
              );
            },
            icon: const Icon(Icons.person_add),
            label: const Text("Add New"),
          ),
        ],
      ),
    );
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Log Out?"),
        content: const Text("Are you sure you want to log out from ChauffiQ?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pushAndRemoveUntil(
                context,
                MaterialPageRoute(builder: (_) => const LoginScreen()),
                (route) => false,
              );
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Logged out successfully.")),
              );
            },
            child: const Text("Log Out"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F9FC),
      appBar: AppBar(
        title: const Text("Profile & Settings"),
        backgroundColor: Colors.blue,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // ── Senior Citizen Mode Alert Banner (Feature 3) ────────────────
            if (_seniorCitizenMode) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.amber.shade100,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.amber.shade700, width: 2),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.elderly, size: 38, color: Colors.black87),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Senior Citizen Mode Active",
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            "High contrast, large buttons & 24/7 Priority Emergency response enabled.",
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade800),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // ── 1. User Profile Header ──────────────────────────────────────
            _buildProfileHeader(),

            const SizedBox(height: 16),

            // ── 2. ChauffiQ Wallet Card ─────────────────────────────────────
            _buildWalletCard(),

            const SizedBox(height: 16),

            // ── 3. Favorite Drivers Section (Feature 4) ─────────────────────
            _buildFavoriteDriversSection(),

            const SizedBox(height: 16),

            // ── 4. Saved Addresses Section ──────────────────────────────────
            _buildSavedPlacesSection(),

            const SizedBox(height: 16),

            // ── 5. Vehicle Vault & Car Care (Feature 6) ─────────────────────
            _buildVehicleVaultSection(),

            const SizedBox(height: 16),

            // ── 6. Safety & Security Section ────────────────────────────────
            _buildSafetySection(),

            const SizedBox(height: 16),

            // ── 6. App Preferences Section ──────────────────────────────────
            _buildPreferencesSection(),

            const SizedBox(height: 16),

            // ── 7. Help & Support ───────────────────────────────────────────
            _buildSupportSection(),

            const SizedBox(height: 24),

            // ── 8. Logout Button ────────────────────────────────────────────
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  side: const BorderSide(color: Colors.red, width: 1.5),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: _showLogoutDialog,
                icon: const Icon(Icons.logout),
                label: const Text("LOG OUT", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              "ChauffiQ Version 1.0.0 • Made with Flutter",
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  // ─── Profile Header ───────────────────────────────────────────────────────
  Widget _buildProfileHeader() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Stack(
            children: [
              const CircleAvatar(
                radius: 38,
                backgroundColor: Colors.blue,
                child: Icon(Icons.person, size: 48, color: Colors.white),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Colors.amber,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.star, size: 14, color: Colors.white),
                ),
              ),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text(
                      "Vikram Sharma",
                      style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade100,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        "GOLD",
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.amber,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  "+91 98765 43210",
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                ),
                Text(
                  "vikram.sharma@example.com",
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.edit_outlined, color: Colors.blue),
            tooltip: "Edit Profile",
            onPressed: _showEditProfileDialog,
          ),
        ],
      ),
    );
  }

  // ─── Wallet & Credits Card ────────────────────────────────────────────────
  Widget _buildWalletCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue.shade700, Colors.blue.shade500],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "ChauffiQ Wallet",
                style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 13),
              ),
              const SizedBox(height: 4),
              const Text(
                "₹450.00",
                style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: Colors.blue,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Add money simulated.")),
              );
            },
            icon: const Icon(Icons.add, size: 16),
            label: const Text("Add Money"),
          ),
        ],
      ),
    );
  }

  // ─── Favorite Drivers (Feature 4) ─────────────────────────────────────────
  Widget _buildFavoriteDriversSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.favorite, color: Colors.redAccent, size: 20),
              SizedBox(width: 8),
              Text(
                "Favorite & Dedicated Drivers",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _favoriteDriverTile("Rahul Sharma", "⭐ 4.8 • BMW Sedan", "Daily Commute Driver"),
          const Divider(),
          _favoriteDriverTile("Ravi Kumar", "⭐ 4.8 • Swift Dzire", "Weekend & Airport Trips"),
        ],
      ),
    );
  }

  Widget _favoriteDriverTile(String name, String sub, String note) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              const CircleAvatar(
                backgroundColor: Colors.blue,
                child: Icon(Icons.person, color: Colors.white),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  Text(sub, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                  Text(note, style: const TextStyle(fontSize: 11, color: Colors.blue, fontWeight: FontWeight.w600)),
                ],
              ),
            ],
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              visualDensity: VisualDensity.compact,
              backgroundColor: Colors.blue,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text("Booking request sent to $name!")),
              );
            },
            child: const Text("Book Again", style: TextStyle(fontSize: 11)),
          ),
        ],
      ),
    );
  }

  // ─── Saved Places ─────────────────────────────────────────────────────────
  Widget _buildSavedPlacesSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                "Saved Places",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              TextButton.icon(
                onPressed: _showAddPlaceDialog,
                icon: const Icon(Icons.add_location_alt_outlined, size: 16),
                label: const Text("Add"),
              ),
            ],
          ),
          const Divider(),
          _placeTile(Icons.home_outlined, "Home", "Flat 402, Green Meadows, Madhapur"),
          const Divider(),
          _placeTile(Icons.business_outlined, "Work", "Cyber Gateway, Tower 3, Hitech City"),
        ],
      ),
    );
  }

  Widget _placeTile(IconData icon, String title, String address) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.blue, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                Text(address, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: Colors.grey),
        ],
      ),
    );
  }

  // ─── Vehicle Vault & Assistance (Feature 6) ───────────────────────────────
  Widget _buildVehicleVaultSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.car_repair, color: Colors.amber, size: 22),
                  SizedBox(width: 8),
                  Text(
                    "Vehicle Vault & Service",
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              TextButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const VehicleAssistanceScreen(),
                    ),
                  );
                },
                child: const Text("View All (4)"),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Urgent Reminder Tile
          InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const VehicleAssistanceScreen(),
                ),
              );
            },
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.orange.shade200),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(
                      color: Colors.orange,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.security, color: Colors.white, size: 18),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Insurance Renewal Due",
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        SizedBox(height: 2),
                        Text(
                          "Expires in 15 days • Comprehensive Cover",
                          style: TextStyle(fontSize: 11, color: Colors.black54),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.orange,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      "ACTION",
                      style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          // Doorstep Mechanic / PUC Tile
          InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const VehicleAssistanceScreen(),
                ),
              );
            },
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(
                      color: Colors.blue,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.build_circle_outlined, color: Colors.white, size: 18),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Doorstep Mechanic & Service",
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        SizedBox(height: 2),
                        Text(
                          "PUC valid 30d • Scheduled 30,000 km checkup",
                          style: TextStyle(fontSize: 11, color: Colors.black54),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: Colors.blue),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Safety & Security ────────────────────────────────────────────────────
  Widget _buildSafetySection() {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Safety & Emergency",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.contact_phone_outlined, color: Colors.red),
              title: const Text("Trusted Emergency Contacts"),
              subtitle: const Text("2 contacts configured"),
              trailing: const Icon(Icons.chevron_right),
              onTap: _showEmergencyContactsDialog,
            ),
            const Divider(),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.share_location_outlined, color: Colors.blue),
              title: const Text("Auto-Share Live Ride"),
              subtitle: const Text("Share GPS tracking automatically during trips"),
              value: _shareLiveTrip,
              activeThumbColor: Colors.blue,
              onChanged: (val) {
                setState(() {
                  _shareLiveTrip = val;
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  // ─── App Preferences (With Feature 3: Senior Citizen Mode) ────────────────
  Widget _buildPreferencesSection() {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "App Preferences & Accessibility",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            // Senior Citizen Mode Switch (Feature 3)
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.elderly, color: Colors.amber, size: 28),
              title: const Text(
                "Senior Citizen Mode",
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              subtitle: const Text("Large high-contrast text, simplified flow & priority voice assistance"),
              value: _seniorCitizenMode,
              activeThumbColor: Colors.amber.shade800,
              onChanged: (val) {
                setState(() {
                  _seniorCitizenMode = val;
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      _seniorCitizenMode
                          ? "👴 Senior Citizen Accessibility Mode Activated."
                          : "Standard mode restored.",
                    ),
                    backgroundColor: _seniorCitizenMode ? Colors.amber.shade800 : Colors.blue,
                  ),
                );
              },
            ),
            const Divider(),

            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.language_outlined, color: Colors.blue),
              title: const Text("Language"),
              subtitle: Text(_selectedLanguage),
              trailing: DropdownButton<String>(
                value: _selectedLanguage,
                underline: const SizedBox(),
                items: _languages.map((l) => DropdownMenuItem(value: l, child: Text(l))).toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() {
                      _selectedLanguage = val;
                    });
                  }
                },
              ),
            ),
            const Divider(),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.dark_mode_outlined, color: Colors.blue),
              title: const Text("Dark Mode"),
              subtitle: const Text("Simulate dark appearance"),
              value: _isDarkMode,
              activeThumbColor: Colors.blue,
              onChanged: (val) {
                setState(() {
                  _isDarkMode = val;
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(_isDarkMode ? "Dark mode enabled" : "Light mode enabled")),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  // ─── Help & Support ───────────────────────────────────────────────────────
  Widget _buildSupportSection() {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Help & Legal",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.help_outline, color: Colors.blue),
              title: const Text("Help & Support Center"),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Help Center FAQ simulated.")),
                );
              },
            ),
            const Divider(),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.policy_outlined, color: Colors.blue),
              title: const Text("Terms of Service & Privacy"),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
          ],
        ),
      ),
    );
  }
}
