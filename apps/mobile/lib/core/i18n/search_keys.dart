import 'normalize.dart';
import 'devanagari_transliterate.dart';
import 'translate.dart';
import 'i18n_store.dart';
import 'language_mode.dart';

String buildSearchKey({
  required String englishText,
  String? citySlug,
  String? propertyType,
  String? localityText,
}) {
  final buffer = StringBuffer();
  buffer.write(normalize(englishText));
  if (citySlug != null && citySlug.isNotEmpty) {
    buffer.write(' ');
    buffer.write(normalize(citySlug));
    _appendTranslations(buffer, cityKeyFromSlug(citySlug));
  }
  if (propertyType != null && propertyType.isNotEmpty) {
    buffer.write(' ');
    buffer.write(normalize(propertyType));
    _appendTranslations(buffer, ptypeKey(propertyType));
  }
  if (localityText != null && localityText.isNotEmpty) {
    final key = localityKeyFromEnglish(localityText);
    if (key != null) {
      _appendTranslations(buffer, key);
    }
  }
  return buffer.toString().trim();
}

bool matchesQuery(String searchKey, String query) {
  final q1 = normalize(query);
  final q2 = normalize(devToLatin(query));
  if (q1.isEmpty && q2.isEmpty) return true;
  if (q1.isNotEmpty && searchKey.contains(q1)) return true;
  if (q2.isNotEmpty && searchKey.contains(q2)) return true;
  return false;
}

void _appendTranslations(StringBuffer buffer, String key) {
  final store = I18nStore.instance;
  final mr = store.mapFor(LanguageMode.mr)[key];
  final hi = store.mapFor(LanguageMode.hi)[key];
  if (mr != null && mr.isNotEmpty) {
    buffer.write(' ');
    buffer.write(normalize(devToLatin(mr)));
  }
  if (hi != null && hi.isNotEmpty) {
    buffer.write(' ');
    buffer.write(normalize(devToLatin(hi)));
  }
}
