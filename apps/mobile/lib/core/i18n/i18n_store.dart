import 'dart:convert';
import 'package:flutter/services.dart';
import 'language_mode.dart';

class I18nStore {
  I18nStore._();

  static final I18nStore instance = I18nStore._();

  final Map<LanguageMode, Map<String, String>> _maps = {};
  bool _loaded = false;

  Future<void> ensureLoaded() async {
    if (_loaded) return;
    _maps[LanguageMode.en] = await _loadMap('assets/i18n/en.json');
    _maps[LanguageMode.mr] = await _loadMap('assets/i18n/mr.json');
    _maps[LanguageMode.hi] = await _loadMap('assets/i18n/hi.json');
    _loaded = true;
  }

  String t(String key, LanguageMode mode, {String? fallback}) {
    final map = _maps[mode];
    final en = _maps[LanguageMode.en];
    return map?[key] ?? en?[key] ?? fallback ?? key;
  }

  Map<String, String> mapFor(LanguageMode mode) {
    return _maps[mode] ?? const {};
  }

  Future<Map<String, String>> _loadMap(String path) async {
    final raw = await rootBundle.loadString(path);
    final decoded = json.decode(raw);
    if (decoded is! Map) return {};
    return decoded.map((key, value) => MapEntry(key.toString(), value.toString()));
  }
}
