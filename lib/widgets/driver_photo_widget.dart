import 'dart:io' show File;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';

import '../models/driver.dart';

/// Returns the correct [ImageProvider] for a [Driver]'s photo.
///
/// • On **web**:    uses [MemoryImage] from [Driver.imageBytes] (blob bytes).
/// • On **native**: uses [FileImage] from [Driver.imagePath] (local file).
/// • Fallback:      returns `null` — callers should show a default icon.
ImageProvider? driverImageProvider(Driver driver) {
  if (kIsWeb) {
    // Flutter Web: image_picker returns XFile whose path is a blob: URL.
    // dart:io File does NOT exist on web, so we stored raw bytes instead.
    if (driver.imageBytes != null) {
      return MemoryImage(driver.imageBytes!);
    }
    return null;
  } else {
    // Android / iOS / Desktop: image_picker gives a real file path.
    if (driver.imagePath != null && File(driver.imagePath!).existsSync()) {
      return FileImage(File(driver.imagePath!));
    }
    return null;
  }
}

/// A reusable [CircleAvatar] that displays the driver's uploaded photo.
///
/// Shows a blue person icon when no photo is available (photo is optional).
///
/// [radius] controls the size — use 35 for list cards, 60 for detail screens.
class DriverAvatar extends StatelessWidget {
  final Driver driver;
  final double radius;

  const DriverAvatar({
    super.key,
    required this.driver,
    this.radius = 35,
  });

  @override
  Widget build(BuildContext context) {
    final ImageProvider? provider = driverImageProvider(driver);

    return CircleAvatar(
      radius: radius,
      backgroundColor: Colors.blue.shade100,
      backgroundImage: provider,
      child: provider == null
          ? Icon(
              Icons.person,
              size: radius * 1.1,
              color: Colors.blue,
            )
          : null,
    );
  }
}
