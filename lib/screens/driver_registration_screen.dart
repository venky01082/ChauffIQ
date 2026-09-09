import 'dart:io' show File;
import 'dart:typed_data'; // Uint8List

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../data/driver_database.dart';
import '../models/driver.dart';
import '../services/api_service.dart';

class DriverRegistrationScreen extends StatefulWidget {
  const DriverRegistrationScreen({super.key});

  @override
  State<DriverRegistrationScreen> createState() =>
      _DriverRegistrationScreenState();
}

class _DriverRegistrationScreenState
    extends State<DriverRegistrationScreen> {
  bool _isSubmitting = false;
  // ─── Image picker state ───────────────────────────────────────────────────
  //
  // We store TWO representations of the picked image:
  //
  //   _pickedFile    → the XFile from image_picker (cross-platform)
  //   _webImageBytes → the raw bytes (used ONLY on web for preview + storage)
  //
  // On Android/iOS: preview uses File(_pickedFile!.path) via FileImage.
  // On Web:         dart:io.File doesn't exist, so we use MemoryImage(_webImageBytes!).
  XFile? _pickedFile;
  Uint8List? _webImageBytes;

  // ─── Form controllers ─────────────────────────────────────────────────────
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _vehicleTypeController = TextEditingController();
  final TextEditingController _vehicleNumberController =
      TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _vehicleTypeController.dispose();
    _vehicleNumberController.dispose();
    super.dispose();
  }

  // ─── Image picker ─────────────────────────────────────────────────────────
  Future<void> _pickImage() async {
    final ImagePicker picker = ImagePicker();
    final XFile? file = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
    );

    if (file == null) return; // user cancelled

    if (kIsWeb) {
      // On web, read the bytes immediately — this is the only way to render
      // and store the image since dart:io.File is unavailable on web.
      final Uint8List bytes = await file.readAsBytes();
      setState(() {
        _pickedFile = file;
        _webImageBytes = bytes;
      });
    } else {
      // On Android/iOS, a real file path is available.
      setState(() {
        _pickedFile = file;
        _webImageBytes = null; // not needed on native
      });
    }
  }

  // ─── Preview image provider ───────────────────────────────────────────────
  // Returns the right ImageProvider for the CircleAvatar preview
  // based on the current platform.
  ImageProvider? get _previewImage {
    if (_pickedFile == null) return null;
    if (kIsWeb) {
      return _webImageBytes != null ? MemoryImage(_webImageBytes!) : null;
    } else {
      return FileImage(File(_pickedFile!.path));
    }
  }

  // ─── Register driver ──────────────────────────────────────────────────────
  Future<void> _registerDriver() async {
    if (_nameController.text.trim().isEmpty ||
        _phoneController.text.trim().isEmpty ||
        _vehicleTypeController.text.trim().isEmpty ||
        _vehicleNumberController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please fill all fields before registering.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    final vehicleType = _vehicleTypeController.text.trim();
    final vehicleNumber = _vehicleNumberController.text.trim();

    // Invoke live Cloud Functions backend
    try {
      await ApiService.createDriver(
        vehicleType: vehicleType,
        vehicleModel: vehicleType,
        vehicleNumber: vehicleNumber,
        licenseNumber: "DL-${DateTime.now().millisecondsSinceEpoch % 100000}",
        name: name,
        phone: phone,
      );
    } catch (e) {
      debugPrint("Backend driver creation note: $e");
    }

    // Cache locally for instant UI update
    DriverDatabase.drivers.add(
      Driver(
        name: name,
        phone: phone,
        vehicleType: vehicleType,
        vehicleNumber: vehicleNumber,
        imagePath: kIsWeb ? null : _pickedFile?.path,
        imageBytes: kIsWeb ? _webImageBytes : null,
        rating: 4.9,
        eta: '3 min',
        fare: 650,
      ),
    );

    if (!mounted) return;
    setState(() {
      _isSubmitting = false;
      _pickedFile = null;
      _webImageBytes = null;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Driver Registered Successfully ✅'),
        backgroundColor: Colors.green,
      ),
    );

    // Reset form
    _nameController.clear();
    _phoneController.clear();
    _vehicleTypeController.clear();
    _vehicleNumberController.clear();
  }

  // ─── Build ────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final ImageProvider? preview = _previewImage;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Driver Registration'),
        backgroundColor: Colors.blue,
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Column(
            children: [
              // ── Photo upload section ──────────────────────────────────────
              GestureDetector(
                onTap: _pickImage,
                child: Stack(
                  alignment: Alignment.bottomRight,
                  children: [
                    CircleAvatar(
                      radius: 60,
                      backgroundColor: Colors.blue.shade50,
                      backgroundImage: preview,
                      child: preview == null
                          ? const Icon(
                              Icons.person,
                              size: 70,
                              color: Colors.blue,
                            )
                          : null,
                    ),
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: Colors.blue,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.camera_alt,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 8),

              Text(
                _pickedFile == null
                    ? 'Tap to upload photo'
                    : 'Tap to change photo',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
              ),

              const SizedBox(height: 24),

              // ── Text fields ───────────────────────────────────────────────
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Driver Name',
                  prefixIcon: Icon(Icons.person_outline),
                  border: OutlineInputBorder(),
                ),
              ),

              const SizedBox(height: 15),

              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  prefixIcon: Icon(Icons.phone_outlined),
                  border: OutlineInputBorder(),
                ),
              ),

              const SizedBox(height: 15),

              TextField(
                controller: _vehicleTypeController,
                decoration: const InputDecoration(
                  labelText: 'Vehicle Type',
                  prefixIcon: Icon(Icons.directions_car_outlined),
                  border: OutlineInputBorder(),
                ),
              ),

              const SizedBox(height: 15),

              TextField(
                controller: _vehicleNumberController,
                decoration: const InputDecoration(
                  labelText: 'Vehicle Number',
                  prefixIcon: Icon(Icons.pin_outlined),
                  border: OutlineInputBorder(),
                ),
              ),

              const SizedBox(height: 30),

              // ── Register button ───────────────────────────────────────────
              SizedBox(
                width: double.infinity,
                height: 55,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _registerDriver,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.how_to_reg),
                            SizedBox(width: 8),
                            Text(
                              'REGISTER DRIVER',
                              style: TextStyle(fontSize: 18),
                            ),
                          ],
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}