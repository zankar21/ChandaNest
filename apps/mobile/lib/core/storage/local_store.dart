import 'package:shared_preferences/shared_preferences.dart';
import '../i18n/language_mode.dart';

class LocalStore {
  static const _cityKey = 'selected_city_slug';
  static const _savedKey = 'saved_ids';
  static const _languageKey = 'language_mode';

  String? _cachedCity;
  Set<String>? _cachedSaved;
  String? _cachedLanguage;

  Future<String?> getCitySlug() async {
    if (_cachedCity != null) return _cachedCity;
    final prefs = await SharedPreferences.getInstance();
    _cachedCity = prefs.getString(_cityKey);
    return _cachedCity;
  }

  Future<void> setCitySlug(String citySlug) async {
    _cachedCity = citySlug;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_cityKey, citySlug);
  }

  Future<Set<String>> getSavedIds() async {
    if (_cachedSaved != null) return _cachedSaved!;
    final prefs = await SharedPreferences.getInstance();
    final items = prefs.getStringList(_savedKey) ?? <String>[];
    _cachedSaved = items.toSet();
    return _cachedSaved!;
  }

  Future<void> setSavedIds(Set<String> ids) async {
    _cachedSaved = ids;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_savedKey, ids.toList());
  }

  Future<String?> getLanguageCode() async {
    if (_cachedLanguage != null) return _cachedLanguage;
    final prefs = await SharedPreferences.getInstance();
    _cachedLanguage = prefs.getString(_languageKey);
    return _cachedLanguage;
  }

  Future<void> setLanguageCode(String code) async {
    _cachedLanguage = code;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_languageKey, code);
  }

  Future<LanguageMode?> getLanguageMode() async {
    final code = await getLanguageCode();
    if (code == null) return null;
    return languageModeFromCode(code);
  }

  Future<void> setLanguageMode(LanguageMode mode) async {
    await setLanguageCode(languageModeToCode(mode));
  }
}
