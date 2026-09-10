import 'package:flutter/material.dart';
import '../services/api_service.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  int _balance = 1450;

  final List<Map<String, dynamic>> _transactions = [
    {
      "title": "Ride to Inorbit Mall",
      "subtitle": "Chauffeur: Rahul Sharma • Sedan",
      "date": "Yesterday, 6:45 PM",
      "amount": -380,
      "type": "ride",
      "icon": Icons.directions_car_filled,
      "color": Colors.blue,
    },
    {
      "title": "Wallet Auto-Recharge",
      "subtitle": "Via UPI • Google Pay",
      "date": "03 Sep 2026, 10:15 AM",
      "amount": 1000,
      "type": "recharge",
      "icon": Icons.account_balance_wallet,
      "color": Colors.green,
    },
    {
      "title": "Ride Cashback Bonus",
      "subtitle": "Special 10% Gold Commuter Perk",
      "date": "01 Sep 2026, 02:30 PM",
      "amount": 50,
      "type": "cashback",
      "icon": Icons.card_giftcard,
      "color": Colors.amber,
    },
    {
      "title": "Ride to Rajiv Gandhi Intl. Airport",
      "subtitle": "Chauffeur: Ravi Kumar • SUV",
      "date": "28 Aug 2026, 08:00 AM",
      "amount": -650,
      "type": "ride",
      "icon": Icons.flight_takeoff,
      "color": Colors.blue,
    },
    {
      "title": "Referral Reward",
      "subtitle": "Friend Vikram joined ChauffiQ",
      "date": "24 Aug 2026, 11:20 AM",
      "amount": 100,
      "type": "referral",
      "icon": Icons.group_add,
      "color": Colors.purple,
    },
  ];

  void _recharge(int amount) {
    // Record payment in backend ledger
    ApiService.createPayment(
      rideId: "wallet_${DateTime.now().millisecondsSinceEpoch % 100000}",
      amount: amount.toDouble(),
      paymentMethod: "UPI",
    ).then((res) {
      if (res["success"] == true && res["data"] is Map && res["data"]["paymentId"] != null) {
        ApiService.simulatePaymentResult(
          paymentId: res["data"]["paymentId"].toString(),
          outcome: "SUCCESS",
        );
      }
    }).catchError((_) {});

    setState(() {
      _balance += amount;
      _transactions.insert(0, {
        "title": "Quick Wallet Recharge",
        "subtitle": "Instant UPI Transfer",
        "date": "Just now",
        "amount": amount,
        "type": "recharge",
        "icon": Icons.add_card,
        "color": Colors.green,
      });
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text("₹$amount added to your ChauffiQ Wallet successfully!"),
        backgroundColor: Colors.green.shade800,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showCustomRechargeDialog() {
    final TextEditingController amountCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.account_balance_wallet_outlined, color: Colors.blue),
            SizedBox(width: 8),
            Text("Add Money to Wallet"),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Enter recharge amount in ₹",
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: amountCtrl,
              keyboardType: TextInputType.number,
              autofocus: true,
              decoration: InputDecoration(
                prefixText: "₹ ",
                prefixStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                hintText: "500",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
            onPressed: () {
              final val = int.tryParse(amountCtrl.text.trim());
              if (val != null && val > 0) {
                Navigator.pop(ctx);
                _recharge(val);
              }
            },
            child: const Text("Proceed to Pay"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text("ChauffiQ Wallet"),
        backgroundColor: Colors.blue,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── 1. Luxury Balance Card ──────────────────────────────────────
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    const Color(0xFF0F172A),
                    Colors.blue.shade900,
                  ],
                ),
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: Colors.blue.shade900.withValues(alpha: 0.3),
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
                      const Text(
                        "AVAILABLE BALANCE",
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                          letterSpacing: 1.2,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.amber.withValues(alpha: 0.25),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: Colors.amber.shade300, width: 1),
                        ),
                        child: const Text(
                          "GOLD COMMUTER",
                          style: TextStyle(
                            color: Colors.amber,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    "₹$_balance",
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 36,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Divider(color: Colors.white24),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.shield, color: Colors.greenAccent, size: 16),
                          SizedBox(width: 6),
                          Text(
                            "100% Safe & RBI Compliant",
                            style: TextStyle(color: Colors.white70, fontSize: 11),
                          ),
                        ],
                      ),
                      TextButton.icon(
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.amber,
                          padding: EdgeInsets.zero,
                          visualDensity: VisualDensity.compact,
                        ),
                        onPressed: _showCustomRechargeDialog,
                        icon: const Icon(Icons.add_circle, size: 16),
                        label: const Text("Custom Amount"),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // ── 2. Quick Recharge Pills (+500, +1000, +2000) ────────────────
            const Text(
              "Quick Recharge",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
            ),
            const SizedBox(height: 10),
            Row(
              children: [500, 1000, 2000].map((amount) {
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: Colors.blue.shade900,
                        elevation: 1,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: BorderSide(color: Colors.blue.shade200),
                        ),
                      ),
                      onPressed: () => _recharge(amount),
                      child: Text(
                        "+ ₹$amount",
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: 24),

            // ── 3. Payment Methods Overview ─────────────────────────────────
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Linked Payment Methods",
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  _paymentMethodTile(
                    Icons.account_balance,
                    "UPI / Google Pay",
                    "vikram@okhdfcbank",
                    isSelected: true,
                  ),
                  const Divider(height: 16),
                  _paymentMethodTile(
                    Icons.credit_card,
                    "HDFC Regalia Credit Card",
                    "•••• 4921",
                    isSelected: false,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // ── 4. Transaction History ──────────────────────────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  "Recent Transactions",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
                ),
                Text(
                  "${_transactions.length} items",
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
              ],
            ),
            const SizedBox(height: 10),

            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _transactions.length,
              separatorBuilder: (context, index) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final tx = _transactions[index];
                final int amount = tx["amount"] as int;
                final bool isCredit = amount > 0;

                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: (tx["color"] as Color).withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(tx["icon"] as IconData, color: tx["color"] as Color, size: 20),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              tx["title"] as String,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              tx["subtitle"] as String,
                              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              tx["date"] as String,
                              style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        isCredit ? "+₹$amount" : "-₹${amount.abs()}",
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: isCredit ? Colors.green.shade700 : Colors.black87,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _paymentMethodTile(IconData icon, String title, String subtitle, {required bool isSelected}) {
    return Row(
      children: [
        Icon(icon, color: Colors.blue.shade800, size: 22),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              Text(subtitle, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
            ],
          ),
        ),
        if (isSelected)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: Colors.green.shade300),
            ),
            child: Text(
              "DEFAULT",
              style: TextStyle(color: Colors.green.shade800, fontSize: 10, fontWeight: FontWeight.bold),
            ),
          ),
      ],
    );
  }
}
