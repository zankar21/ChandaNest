class Env {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8080',
  );
  static const tenantId = String.fromEnvironment(
    'TENANT_ID',
    defaultValue: 'powerpulsetech',
  );
  static const defaultCitySlug = String.fromEnvironment(
    'DEFAULT_CITY_SLUG',
    defaultValue: 'chandrapur',
  );
  static const bool useMockData = bool.fromEnvironment(
    'USE_MOCK',
    defaultValue: false,
  );
  static const appVersion = String.fromEnvironment(
    'APP_VERSION',
    defaultValue: 'unknown',
  );
  static const buildNumber = String.fromEnvironment(
    'BUILD_NUMBER',
    defaultValue: 'unknown',
  );
}
