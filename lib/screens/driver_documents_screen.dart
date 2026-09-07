import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

class DriverDocumentsScreen extends StatefulWidget {
  const DriverDocumentsScreen({super.key});

  @override
  State<DriverDocumentsScreen> createState() => _DriverDocumentsScreenState();
}

class _DriverDocumentsScreenState extends State<DriverDocumentsScreen> {
  final ImagePicker _picker = ImagePicker();

  // Document states
  final Map<String, Uint8List?> _uploadedBytes = {};
  final Map<String, String> _documentStatuses = {
    "dl": "Approved",
    "aadhaar": "Approved",
    "rc": "Pending",
    "insurance": "Action Required",
  };

  int get _approvedCount =>
      _documentStatuses.values.where((s) => s == "Approved").length;

  Future<void> _pickDocument(String docKey) async {
    try {
      final XFile? file = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 85,
      );

      if (file != null) {
        final bytes = await file.readAsBytes();
        setState(() {
          _uploadedBytes[docKey] = bytes;
          _documentStatuses[docKey] = "Pending"; // Mark under review
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Document uploaded successfully. Sent for AI OCR verification!"),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Error picking file: $e"),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showDocumentPreview(String title, String docKey, String docNumber, String details) {
    final bytes = _uploadedBytes[docKey];

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: Row(
          children: [
            const Icon(Icons.verified_outlined, color: Colors.amber, size: 22),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 180,
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white24),
              ),
              child: bytes != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.memory(bytes, fit: BoxFit.cover),
                    )
                  : Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.description, size: 48, color: Colors.blue.shade300),
                          const SizedBox(height: 8),
                          const Text(
                            "Verified Document Certificate",
                            style: TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            docNumber,
                            style: const TextStyle(color: Colors.amber, fontSize: 13, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
            ),
            const SizedBox(height: 14),
            Text(
              "Certificate Details:",
              style: TextStyle(color: Colors.grey.shade400, fontSize: 12, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              details,
              style: const TextStyle(color: Colors.white, fontSize: 13),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Close", style: TextStyle(color: Colors.white70)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
            onPressed: () {
              Navigator.pop(ctx);
              _pickDocument(docKey);
            },
            child: const Text("Re-upload File"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalDocs = _documentStatuses.length;
    final progress = _approvedCount / totalDocs;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Midnight Dark Navy
      appBar: AppBar(
        title: const Text(
          "Driver Verification & Documents",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
        ),
        backgroundColor: const Color(0xFF1E293B),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── 1. Progress & Verification Summary ──────────────────────────
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.blue.shade900, Colors.indigo.shade900],
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.blue.withValues(alpha: 0.25),
                    blurRadius: 12,
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
                        "Verification Status",
                        style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: _approvedCount == totalDocs ? Colors.green : Colors.amber,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _approvedCount == totalDocs ? "VERIFIED" : "IN REVIEW",
                          style: const TextStyle(
                            color: Colors.black,
                            fontWeight: FontWeight.w900,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "$_approvedCount of $totalDocs mandatory credentials approved. Commercial chauffeurs must be 100% verified.",
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 12.5),
                  ),
                  const SizedBox(height: 14),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: progress,
                      backgroundColor: Colors.white24,
                      valueColor: AlwaysStoppedAnimation<Color>(_approvedCount == totalDocs ? Colors.greenAccent : Colors.amber),
                      minHeight: 8,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            const Text(
              "Required Documents",
              style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            // ── Document 1: Commercial Driving License ──────────────────────
            _buildDocCard(
              title: "1. Commercial Driving License",
              category: "LMV Transport / Commercial",
              docNumber: "DL-042022009814",
              docKey: "dl",
              expiry: "Valid till: 11 Jan 2032",
              icon: Icons.drive_eta,
              details: "Authorized for Commercial Light Motor Vehicles (LMV-TR). Verified via Parivahan RTO Portal.",
            ),

            // ── Document 2: Aadhaar Card ────────────────────────────────────
            _buildDocCard(
              title: "2. Aadhaar Card (National Identity)",
              category: "Identity & Resident Proof",
              docNumber: "XXXX-XXXX-8912",
              docKey: "aadhaar",
              expiry: "UIDAI e-KYC Verified",
              icon: Icons.badge,
              details: "Biometric e-KYC verified with Government of India UIDAI Registry.",
            ),

            // ── Document 3: Vehicle Registration Certificate ────────────────
            _buildDocCard(
              title: "3. Vehicle Registration (RC)",
              category: "AP16FF4912 • BMW 3 Series",
              docNumber: "RC-TS09-8921-X",
              docKey: "rc",
              expiry: "Fitness Valid till: 2029",
              icon: Icons.directions_car,
              details: "Commercial Yellow Board Permit, Fitness Certificate, and Road Tax Paid.",
            ),

            // ── Document 4: Commercial Insurance ────────────────────────────
            _buildDocCard(
              title: "4. Comprehensive Insurance Cover",
              category: "Third-Party & Passenger Liability",
              docNumber: "Policy #BA-8921-2025",
              docKey: "insurance",
              expiry: "Expires: 20 Sep 2026 (Due in 15 days)",
              icon: Icons.security,
              details: "Comprehensive Policy with Passenger Personal Accident cover up to ₹15,00,000.",
            ),

            const SizedBox(height: 20),

            // ── 4. Verification Workflow Pipeline ───────────────────────────
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.timeline, color: Colors.blueAccent, size: 20),
                      SizedBox(width: 8),
                      Text(
                        "Verification Workflow Pipeline",
                        style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  _buildTimelineStep(
                    icon: Icons.check_circle,
                    color: Colors.green,
                    title: "1. Document Upload",
                    subtitle: "All 4 certificates provided",
                    isDone: true,
                  ),
                  _buildTimelineStep(
                    icon: Icons.check_circle,
                    color: Colors.green,
                    title: "2. Automated OCR & RTO Cross-Check",
                    subtitle: "License and RC matched against Parivahan",
                    isDone: true,
                  ),
                  _buildTimelineStep(
                    icon: Icons.hourglass_top_rounded,
                    color: Colors.amber,
                    title: "3. Police Background Verification",
                    subtitle: "State police record check in progress (2-4 hrs)",
                    isDone: false,
                  ),
                  _buildTimelineStep(
                    icon: Icons.verified_user_outlined,
                    color: Colors.grey,
                    title: "4. Live Chauffeur Activation",
                    subtitle: "Ready to accept passenger bookings",
                    isDone: false,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDocCard({
    required String title,
    required String category,
    required String docNumber,
    required String docKey,
    required String expiry,
    required IconData icon,
    required String details,
  }) {
    final status = _documentStatuses[docKey] ?? "Pending";
    final isApproved = status == "Approved";
    final isPending = status == "Pending";
    final hasUploadedFile = _uploadedBytes[docKey] != null;

    Color statusColor = Colors.grey;
    if (isApproved) statusColor = Colors.green;
    if (isPending) statusColor = Colors.amber;
    if (status == "Action Required") statusColor = Colors.orange;

    return Card(
      color: const Color(0xFF1E293B),
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: statusColor.withValues(alpha: 0.35)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: statusColor, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        category,
                        style: TextStyle(color: Colors.grey.shade400, fontSize: 11.5),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: statusColor),
                  ),
                  child: Text(
                    status.toUpperCase(),
                    style: TextStyle(color: statusColor, fontSize: 9.5, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  docNumber,
                  style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600),
                ),
                Text(
                  expiry,
                  style: TextStyle(color: Colors.grey.shade400, fontSize: 11),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white24),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      visualDensity: VisualDensity.compact,
                    ),
                    onPressed: () => _showDocumentPreview(title, docKey, docNumber, details),
                    icon: const Icon(Icons.remove_red_eye, size: 15),
                    label: const Text("Preview", style: TextStyle(fontSize: 12)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: statusColor,
                      foregroundColor: Colors.black87,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      visualDensity: VisualDensity.compact,
                    ),
                    onPressed: () => _pickDocument(docKey),
                    icon: Icon(hasUploadedFile ? Icons.check : Icons.upload_file, size: 15),
                    label: Text(
                      hasUploadedFile ? "Re-upload" : "Choose File",
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineStep({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required bool isDone,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: isDone ? Colors.white : Colors.white70,
                    fontSize: 12.5,
                    fontWeight: isDone ? FontWeight.bold : FontWeight.w500,
                  ),
                ),
                Text(
                  subtitle,
                  style: TextStyle(color: Colors.grey.shade400, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
