import 'language_mode.dart';
import 'i18n_store.dart';
import 'normalize.dart';

String trKey(String key, LanguageMode mode, {String? fallback}) {
  return I18nStore.instance.t(key, mode, fallback: fallback);
}

String trText(String english, LanguageMode mode) {
  final key = _keyForText(english);
  if (key == null) return english;
  return trKey(key, mode, fallback: english);
}

String ptypeKey(String propertyType) {
  switch (propertyType.toLowerCase()) {
    case 'land':
      return 'ptype.land';
    case 'plot':
      return 'ptype.plot';
    case 'apartment':
    case 'flat':
      return 'ptype.flat';
    case 'house':
      return 'ptype.house';
    case 'villa':
      return 'ptype.house';
    case 'office':
    case 'shop':
    case 'warehouse':
      return 'ptype.commercial';
    case 'other':
      return 'ptype.unknown';
    default:
      return 'ptype.unknown';
  }
}

String cityKeyFromSlug(String slug) {
  return 'city.${slug.toLowerCase()}';
}

String trCityFromSlug(String slug, LanguageMode mode) {
  final key = cityKeyFromSlug(slug);
  return trKey(key, mode, fallback: slug);
}

String trLocality(String english, LanguageMode mode) {
  final normalized = normalize(english);
  final key = _localityKeyMap[normalized];
  if (key == null) return english;
  return trKey(key, mode, fallback: english);
}

String? localityKeyFromEnglish(String english) {
  final normalized = normalize(english);
  return _localityKeyMap[normalized];
}

String? _keyForText(String text) {
  switch (normalize(text)) {
    case 'price':
      return 'ui.price';
    case 'area':
      return 'ui.area';
    case 'location':
      return 'ui.location';
    case 'verified':
      return 'ui.verified';
    case 'enquiry':
      return 'ui.enquiry';
    case 'call':
      return 'ui.call';
    case 'save':
      return 'ui.save';
    case 'saved':
      return 'ui.saved';
    case 'filters':
      return 'ui.filters';
    case 'owner':
      return 'ui.owner';
    case 'new':
      return 'ui.new';
    case 'search listings':
      return 'ui.search_listings';
    default:
      return null;
  }
}

const Map<String, String> _localityKeyMap = {
  'civil lines': 'loc.civil_lines',
  'tadoba road': 'loc.tadoba_road',
  'ballarpur road': 'loc.ballarpur_road',
  'ram nagar': 'loc.ram_nagar',
  'nagpur road': 'loc.nagpur_road',
  'main market': 'loc.main_market',
  'padoli': 'loc.padoli',
  'ghuggus': 'loc.ghuggus',
  'bhadrawati': 'loc.bhadrawati',
  'mul road': 'loc.mul_road',
};
