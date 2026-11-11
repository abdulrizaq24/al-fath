import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:screen_retriever/screen_retriever.dart';
import 'package:window_manager/window_manager.dart';

import 'app/app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
    await windowManager.ensureInitialized();

    Size windowSize = const Size(1280, 800);
    try {
      final primaryDisplay = await screenRetriever.getPrimaryDisplay();
      final screenWidth = primaryDisplay.size.width;
      final screenHeight = primaryDisplay.size.height;
      if (screenWidth > 0 && screenHeight > 0) {
        final targetWidth = (screenWidth * 0.92).clamp(900.0, screenWidth);
        final targetHeight = (screenHeight * 0.90).clamp(600.0, screenHeight);
        windowSize = Size(targetWidth, targetHeight);
      }
    } catch (_) {
      // Fallback to standard 1280x800 if display detection fails
    }

    final windowOptions = WindowOptions(
      size: windowSize,
      minimumSize: const Size(900, 600),
      center: true,
      backgroundColor: Colors.transparent,
      skipTaskbar: false,
      title: 'PharmaCare — Offline Pharmacy Management',
    );

    await windowManager.waitUntilReadyToShow(windowOptions, () async {
      await windowManager.show();
      await windowManager.focus();
    });
  }

  runApp(const ProviderScope(child: PharmacyApp()));
}
