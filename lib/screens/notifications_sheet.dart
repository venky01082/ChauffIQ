import 'package:flutter/material.dart';
import 'family_monitoring_screen.dart';
import 'vehicle_assistance_screen.dart';
import 'ride_history_screen.dart';
import 'driver_earnings_screen.dart';

class NotificationsSheet extends StatefulWidget {
  const NotificationsSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const NotificationsSheet(),
    );
  }

  @override
  State<NotificationsSheet> createState() => _NotificationsSheetState();
}

class _NotificationsSheetState extends State<NotificationsSheet> {
  final List<Map<String, dynamic>> _notifications = [
    {
      "id": "1",
      "title": "Driver Arrived at Pickup",
      "body": "Rahul Sharma (AP16FF4912) is waiting at Gate 2, Hitech City Metro Station.",
      "time": "Just now",
      "icon": Icons.local_taxi_rounded,
      "color": Colors.blue,
      "category": "RIDE ALERT",
      "isUnread": true,
      "actionLabel": "Live Status",
    },
    {
      "id": "2",
      "title": "Family Shield: Corridor Verified",
      "body": "Ananya's trip started safely. Live speed: 42 km/h • Route corridor deviation: 0%.",
      "time": "5m ago",
      "icon": Icons.family_restroom,
      "color": Colors.green,
      "category": "SAFETY",
      "isUnread": true,
      "actionLabel": "View Radar",
      "target": const FamilyMonitoringScreen(),
    },
    {
      "id": "3",
      "title": "Vehicle Vault: Insurance Renewal",
      "body": "Policy #BA-8921-2025 for TS09AB1234 expires in 15 days (20 Sep 2026).",
      "time": "2h ago",
      "icon": Icons.security,
      "color": Colors.orange,
      "category": "VEHICLE VAULT",
      "isUnread": true,
      "actionLabel": "Renew Online",
      "target": const VehicleAssistanceScreen(),
    },
    {
      "id": "4",
      "title": "Trip Completed • Receipt CQ-9812",
      "body": "Your ride to Inorbit Mall ended. Fare of ₹450 paid via UPI. Tax invoice ready.",
      "time": "Yesterday",
      "icon": Icons.receipt_long,
      "color": Colors.indigo,
      "category": "INVOICE",
      "isUnread": false,
      "actionLabel": "View Receipt",
      "target": const RideHistoryScreen(),
    },
    {
      "id": "5",
      "title": "Weekend Chauffeur Bonus",
      "body": "Complete 4 rides this Saturday to earn an extra ₹500 directly in your wallet!",
      "time": "2d ago",
      "icon": Icons.monetization_on_outlined,
      "color": Colors.amber,
      "category": "EARNINGS",
      "isUnread": false,
      "actionLabel": "Earnings Hub",
      "target": const DriverEarningsScreen(),
    },
  ];

  int get _unreadCount => _notifications.where((n) => n["isUnread"] == true).length;

  void _markAllAsRead() {
    setState(() {
      for (var n in _notifications) {
        n["isUnread"] = false;
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("All notifications marked as read."),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _handleTap(Map<String, dynamic> item) {
    setState(() {
      item["isUnread"] = false;
    });
    if (item["target"] != null) {
      Navigator.pop(context); // close sheet
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => item["target"] as Widget),
      );
    } else {
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.78,
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A), // Midnight Luxury Dark
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Drag Handle
          const SizedBox(height: 12),
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                const Icon(Icons.notifications_active_rounded, color: Colors.amber, size: 24),
                const SizedBox(width: 10),
                const Text(
                  "Notifications",
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 8),
                if (_unreadCount > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.amber,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      "$_unreadCount NEW",
                      style: const TextStyle(
                        color: Colors.black,
                        fontWeight: FontWeight.w900,
                        fontSize: 10,
                      ),
                    ),
                  ),
                const Spacer(),
                TextButton(
                  onPressed: _unreadCount > 0 ? _markAllAsRead : null,
                  child: Text(
                    "Mark all read",
                    style: TextStyle(
                      color: _unreadCount > 0 ? Colors.blue.shade300 : Colors.grey,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(color: Colors.white12, height: 16),

          // Notifications List
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: _notifications.length,
              separatorBuilder: (context, index) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final n = _notifications[index];
                final Color color = n["color"] as Color;
                final bool isUnread = n["isUnread"] as bool;

                return InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () => _handleTap(n),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isUnread ? const Color(0xFF1E293B) : const Color(0xFF161E2E),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isUnread ? color.withValues(alpha: 0.4) : Colors.white.withValues(alpha: 0.05),
                        width: isUnread ? 1.2 : 1.0,
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Leading Icon Badge
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(n["icon"] as IconData, color: color, size: 22),
                        ),
                        const SizedBox(width: 12),

                        // Notification Content
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: color.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      n["category"] as String,
                                      style: TextStyle(
                                        color: color,
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  const Spacer(),
                                  Text(
                                    n["time"] as String,
                                    style: TextStyle(
                                      color: Colors.grey.shade400,
                                      fontSize: 11,
                                    ),
                                  ),
                                  if (isUnread) ...[
                                    const SizedBox(width: 6),
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: const BoxDecoration(
                                        color: Colors.amber,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                n["title"] as String,
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: isUnread ? FontWeight.bold : FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                n["body"] as String,
                                style: TextStyle(
                                  color: Colors.grey.shade300,
                                  fontSize: 12,
                                  height: 1.35,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Text(
                                    n["actionLabel"] as String,
                                    style: TextStyle(
                                      color: color,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Icon(Icons.arrow_forward, size: 12, color: color),
                                ],
                              ),
                            ],
                          ),
                        ),
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
