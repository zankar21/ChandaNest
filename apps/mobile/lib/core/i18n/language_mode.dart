import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../storage/local_store.dart';

enum LanguageMode { en, mr, hi }

String languageModeToCode(LanguageMode mode) {
  switch (mode) {
    case LanguageMode.en:
      return 'en';
    case LanguageMode.mr:
      return 'mr';
    case LanguageMode.hi:
      return 'hi';
  }
}

LanguageMode languageModeFromCode(String? code) {
  switch (code) {
    case 'mr':
      return LanguageMode.mr;
    case 'hi':
      return LanguageMode.hi;
    case 'en':
    default:
      return LanguageMode.en;
  }
}

class LanguageModeNotifier extends StateNotifier<LanguageMode> {
  LanguageModeNotifier() : super(LanguageMode.en) {
    _load();
  }

  Future<void> _load() async {
    final store = LocalStore();
    final saved = await store.getLanguageMode();
    if (saved != null) {
      state = saved;
    }
  }

  Future<void> setMode(LanguageMode mode) async {
    state = mode;
    final store = LocalStore();
    await store.setLanguageMode(mode);
  }
}

final languageModeProvider = StateNotifierProvider<LanguageModeNotifier, LanguageMode>((ref) {
  return LanguageModeNotifier();
});
