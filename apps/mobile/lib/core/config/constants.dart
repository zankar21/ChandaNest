class AppConstants {
  static const appName = 'ChandaNest';
  static const publicBasePath = '/v1/public';
  static const ownerBasePath = '/v1/owner';
  static const brokeragePartnerId = 'Chandrapur Real Estate Solutions Pvt Ltd';
  static const Map<String, String> citySlugToName = {
    'chandrapur': 'Chandrapur',
    'nagpur': 'Nagpur',
    'gadchiroli': 'Gadchiroli',
    'wardha': 'Wardha',
    'yavatmal': 'Yavatmal',
  };
  static const spacing8 = 8.0;
  static const spacing12 = 12.0;
  static const spacing16 = 16.0;
  static const spacing20 = 20.0;
  static const spacing24 = 24.0;
  static const radius12 = 12.0;
  static const radius16 = 16.0;
  static const radius20 = 20.0;
  static const radius24 = 24.0;

  static String cityNameForSlug(String slug) {
    final mapped = citySlugToName[slug.toLowerCase()];
    if (mapped != null) return mapped;
    if (slug.isEmpty) return '';
    return slug[0].toUpperCase() + slug.substring(1);
  }
}
