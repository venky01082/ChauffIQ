import 'package:flutter/material.dart';

class DriverIntelligenceScreen extends StatelessWidget {
  const DriverIntelligenceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.psychology_outlined, color: Colors.amber),
            SizedBox(width: 8),
            Text("Driver Performance Intelligence"),
          ],
        ),
        backgroundColor: const Color(0xFF0F172A),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── 1. Overall ChauffiQ IQ Score Card ───────────────────────────
            _buildOverallScoreCard(),

            const SizedBox(height: 20),

            // ── 2. Core Telematics & Behavioral Pillars ─────────────────────
            const Text(
              "Behavioral & Performance Pillars",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            _pillarCard("Punctuality Index", "98%", 0.98, "Arrives 1.5 min ahead of schedule", Colors.blue),
            _pillarCard("Safe Driving Telematics", "96%", 0.96, "Zero harsh braking or speeding events", Colors.green),
            _pillarCard("Low Cancellation Rate", "1.4%", 0.986, "Top 5% tier across the city", Colors.teal),
            _pillarCard("Customer Satisfaction", "4.92 / 5.0", 0.984, "Based on 482 verified rider reviews", Colors.amber.shade800),

            const SizedBox(height: 20),

            // ── 3. AI Copilot Coaching Tips ─────────────────────────────────
            _buildAiCoachingCard(),

            const SizedBox(height: 20),

            // ── 4. City Tier Ranking ────────────────────────────────────────
            _buildRankingCard(),
            const SizedBox(height: 25),
          ],
        ),
      ),
    );
  }

  Widget _buildOverallScoreCard() {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.indigo.shade900, Colors.blue.shade800],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: Colors.blue.withValues(alpha: 0.3),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.amber,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  "ELITE TIER CHAUFFEUR",
                  style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 10),
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                "Driver IQ Score",
                style: TextStyle(color: Colors.white70, fontSize: 14),
              ),
              const SizedBox(height: 4),
              const Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    "94",
                    style: TextStyle(color: Colors.white, fontSize: 44, fontWeight: FontWeight.w900),
                  ),
                  Text(
                    " / 100",
                    style: TextStyle(color: Colors.white60, fontSize: 18),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                "Top 3% of drivers in Hyderabad",
                style: TextStyle(color: Colors.greenAccent, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          // Circular Progress Indicator
          SizedBox(
            width: 85,
            height: 85,
            child: Stack(
              fit: StackFit.expand,
              children: [
                CircularProgressIndicator(
                  value: 0.94,
                  strokeWidth: 8,
                  backgroundColor: Colors.white24,
                  valueColor: const AlwaysStoppedAnimation<Color>(Colors.amber),
                ),
                const Center(
                  child: Icon(Icons.military_tech, color: Colors.amber, size: 40),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _pillarCard(String title, String score, double progress, String sub, Color color) {
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
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                Text(
                  score,
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: color),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 6,
                backgroundColor: Colors.grey.shade200,
                valueColor: AlwaysStoppedAnimation<Color>(color),
              ),
            ),
            const SizedBox(height: 8),
            Text(sub, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
          ],
        ),
      ),
    );
  }

  Widget _buildAiCoachingCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.smart_toy_outlined, color: Colors.blue),
              SizedBox(width: 8),
              Text(
                "AI Coaching Insights",
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.blue),
              ),
            ],
          ),
          SizedBox(height: 10),
          Text(
            "• Keep smooth acceleration during 5:00 PM – 8:00 PM peak hours to maintain 5-star ratings.\n• Accepting airport long-haul trips on Friday evening will increase gross revenue by ~22%.\n• Riders appreciate quiet, temperature-regulated cabin settings.",
            style: TextStyle(fontSize: 12, height: 1.5, color: Colors.black87),
          ),
        ],
      ),
    );
  }

  Widget _buildRankingCard() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: const Padding(
        padding: EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            Column(
              children: [
                Text("City Rank", style: TextStyle(fontSize: 12, color: Colors.grey)),
                SizedBox(height: 4),
                Text("#14", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              ],
            ),
            Column(
              children: [
                Text("Badge", style: TextStyle(fontSize: 12, color: Colors.grey)),
                SizedBox(height: 4),
                Text("Diamond", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.blue)),
              ],
            ),
            Column(
              children: [
                Text("Bonus Multiplier", style: TextStyle(fontSize: 12, color: Colors.grey)),
                SizedBox(height: 4),
                Text("1.25x", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.green)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
