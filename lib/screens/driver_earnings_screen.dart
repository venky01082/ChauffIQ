import 'package:flutter/material.dart';

class DriverEarningsScreen extends StatelessWidget {
  const DriverEarningsScreen({super.key});

  final List<Map<String, dynamic>> _weeklyData = const [
    {"day": "Mon", "amount": 1850, "height": 0.55},
    {"day": "Tue", "amount": 2200, "height": 0.70},
    {"day": "Wed", "amount": 2100, "height": 0.65},
    {"day": "Thu", "amount": 2800, "height": 0.85},
    {"day": "Fri", "amount": 3100, "height": 0.95},
    {"day": "Sat", "amount": 3400, "height": 1.0},
    {"day": "Sun", "amount": 2450, "height": 0.75},
  ];

  void _showWithdrawDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Instant Payout"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Available balance to withdraw:"),
            const SizedBox(height: 6),
            const Text(
              "₹8,200.00",
              style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.green),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.account_balance, color: Colors.blue),
                  SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("HDFC Bank •••• 4912", style: TextStyle(fontWeight: FontWeight.bold)),
                      Text("Primary Payout Account", style: TextStyle(fontSize: 11, color: Colors.grey)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text("Payout initiated! ₹8,200 transferred to your bank account."),
                  backgroundColor: Colors.green,
                ),
              );
            },
            child: const Text("TRANSFER NOW"),
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
        title: const Text("Driver Earnings & Wallet"),
        backgroundColor: Colors.blue,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── 1. Weekly Total & Payout Card ───────────────────────────────
            _buildPayoutHeroCard(context),

            const SizedBox(height: 20),

            // ── 2. Weekly Bar Chart ─────────────────────────────────────────
            _buildWeeklyBarChart(),

            const SizedBox(height: 20),

            // ── 3. Performance KPIs Grid ────────────────────────────────────
            _buildKpisGrid(),

            const SizedBox(height: 20),

            // ── 4. Daily Trips Breakdown ────────────────────────────────────
            _buildDailyBreakdown(),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  // ─── Payout Hero Card ─────────────────────────────────────────────────────
  Widget _buildPayoutHeroCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue.shade800, Colors.blue.shade600],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.blue.withValues(alpha: 0.3),
            blurRadius: 14,
            offset: const Offset(0, 6),
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
                "This Week's Gross Earnings",
                style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 13),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  "+18% vs last week",
                  style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            "₹17,900.00",
            style: TextStyle(
              color: Colors.white,
              fontSize: 34,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 18),
          const Divider(color: Colors.white24),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Available for Cashout",
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 12),
                  ),
                  const Text(
                    "₹8,200.00",
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.blue.shade900,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () => _showWithdrawDialog(context),
                icon: const Icon(Icons.arrow_downward, size: 16),
                label: const Text("Cashout", style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── Weekly Bar Chart ─────────────────────────────────────────────────────
  Widget _buildWeeklyBarChart() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Weekly Earnings Trend",
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            "Daily breakdown for the last 7 days",
            style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 140,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: _weeklyData.map((d) {
                final double heightPercent = d["height"] as double;
                final bool isToday = d["day"] == "Sun";

                return Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      "₹${(d["amount"] as int) ~/ 1000}k",
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: isToday ? Colors.blue : Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      width: 22,
                      height: 95 * heightPercent,
                      decoration: BoxDecoration(
                        color: isToday ? Colors.blue : Colors.blue.shade200,
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      d["day"] as String,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
                        color: isToday ? Colors.blue : Colors.black87,
                      ),
                    ),
                  ],
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  // ─── KPIs Grid ────────────────────────────────────────────────────────────
  Widget _buildKpisGrid() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "Performance Insights",
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _kpiCard("Completed Trips", "32", Icons.route, Colors.green)),
            const SizedBox(width: 12),
            Expanded(child: _kpiCard("Online Hours", "28.5 hrs", Icons.schedule, Colors.blue)),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _kpiCard("Driver Rating", "4.9 ⭐", Icons.star, Colors.amber.shade800)),
            const SizedBox(width: 12),
            Expanded(child: _kpiCard("Acceptance Rate", "96%", Icons.thumb_up_alt_outlined, Colors.purple)),
          ],
        ),
      ],
    );
  }

  Widget _kpiCard(String label, String value, IconData icon, Color color) {
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
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                Text(
                  label,
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── Daily Breakdown List ─────────────────────────────────────────────────
  Widget _buildDailyBreakdown() {
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
            "Recent Daily Summaries",
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          _dailySummaryRow("Today (Sun, 05 Sep)", "6 trips • 4.5 hrs", "₹2,450"),
          const Divider(),
          _dailySummaryRow("Yesterday (Sat, 04 Sep)", "8 trips • 6.2 hrs", "₹3,400"),
          const Divider(),
          _dailySummaryRow("Friday (03 Sep)", "7 trips • 5.1 hrs", "₹3,100"),
          const Divider(),
          _dailySummaryRow("Thursday (02 Sep)", "6 trips • 4.8 hrs", "₹2,800"),
        ],
      ),
    );
  }

  Widget _dailySummaryRow(String date, String trips, String earnings) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(date, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              Text(trips, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
            ],
          ),
          Text(
            earnings,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.green),
          ),
        ],
      ),
    );
  }
}
