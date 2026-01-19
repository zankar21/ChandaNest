import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'core/config/env.dart';
import 'core/i18n/i18n_store.dart';
import 'app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const isTest = bool.fromEnvironment('FLUTTER_TEST');
  if (!isTest) {
    try {
      await Firebase.initializeApp();
      await _initFirebaseAppCheck();
      await _initAnalyticsAndCrashlytics();
    } catch (_) {}
  }
  await I18nStore.instance.ensureLoaded();
  if (kDebugMode) {
    final mode = Env.useMockData ? 'MOCK' : 'REAL';
    debugPrint('ChandaNest mode: $mode, API: ${Env.apiBaseUrl}');
  }
  runApp(const ProviderScope(child: App()));
}

Future<void> _initFirebaseAppCheck() async {
  if (kDebugMode) {
    await FirebaseAppCheck.instance.activate(
      androidProvider: AndroidProvider.debug,
      appleProvider: AppleProvider.debug,
    );
  } else {
    await FirebaseAppCheck.instance.activate(
      androidProvider: AndroidProvider.playIntegrity,
      appleProvider: AppleProvider.deviceCheck,
    );
  }
}

Future<void> _initAnalyticsAndCrashlytics() async {
  await FirebaseAnalytics.instance.setAnalyticsCollectionEnabled(!kDebugMode);
  await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(!kDebugMode);
  FlutterError.onError = (details) {
    if (kDebugMode) {
      FlutterError.presentError(details);
      return;
    }
    FirebaseCrashlytics.instance.recordFlutterFatalError(details);
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    if (kDebugMode) {
      return false;
    }
    FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
    return true;
  };
}
