import 'dart:io' show File;
import 'dart:typed_data'; // Uint8List

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../data/driver_database.dart';
import '../models/driver.dart';

class DriverRegistrationScreen extends StatefulWidget {
  const DriverRegistrationScreen({super.key});

  @override
  State<DriverRegistrationScreen> createState() =>
      _DriverRegistrationScreenState();
}

class _DriverRegistrationScreenState
    extends State<DriverRegistrationScreen> {
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
  void _registerDriver() {
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

    DriverDatabase.drivers.add(
      Driver(
        name: _nameController.text.trim(),
        phone: _phoneController.text.trim(),
        vehicleType: _vehicleTypeController.text.trim(),
        vehicleNumber: _vehicleNumberController.text.trim(),
        // On native: store the file path (FileImage will read it later)
        // On web:    imagePath is a blob: URL — not useful, so we store null
        imagePath: kIsWeb ? null : _pickedFile?.path,
        // On web: store the raw bytes (MemoryImage will use these)
        // On native: not needed, the file path is enough
        imageBytes: kIsWeb ? _webImageBytes : null,
        rating: 4.8,
        eta: '5 min',
        fare: 650,
      ),
    );

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
    setState(() {
      _pickedFile = null;
      _webImageBytes = null;
    });
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
                child: ElevatedButton.icon(
                  onPressed: _registerDriver,
                  icon: const Icon(Icons.how_to_reg),
                  label: const Text(
                    'REGISTER DRIVER',
                    style: TextStyle(fontSize: 18),
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