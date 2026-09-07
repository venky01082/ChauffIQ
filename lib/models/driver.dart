import 'dart:typed_data'; // Uint8List — for web image bytes

class Driver {
  final String name;
  final String phone;
  final String vehicleType;
  final String vehicleNumber;

  // ─── Photo fields ──────────────────────────────────────────────────────────
  //
  // imagePath  → used on Android/iOS: absolute file path from image_picker.
  //              Null if no photo was selected.
  //
  // imageBytes → used on Flutter Web: raw JPEG/PNG bytes read from XFile.
  //              Web doesn't support dart:io, so FileImage won't work there.
  //              Instead we use MemoryImage(imageBytes!) on web.
  //              Null if no photo was selected OR running on a native platform.
  //
  // Only one of these will be populated at a time depending on the platform.
  final String? imagePath;
  final Uint8List? imageBytes;

  final double rating;
  final String eta;
  final int fare;

  Driver({
    required this.name,
    required this.phone,
    required this.vehicleType,
    required this.vehicleNumber,
    this.imagePath,
    this.imageBytes,
    required this.rating,
    required this.eta,
    required this.fare,
  });
}