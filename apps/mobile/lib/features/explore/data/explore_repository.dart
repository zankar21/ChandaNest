import '../../../core/network/contracts/explore_contract.dart';
import '../../../core/i18n/i18n_store.dart';
import '../../../core/i18n/search_keys.dart';
import '../../../shared/models/mock_data.dart';
import '../../../shared/models/property.dart';

class ExploreRepositoryMock implements ExploreRepositoryContract {
  @override
  Future<List<Property>> search(
    String citySlug, {
    String? type,
    String? query,
    String? sort,
    int? minPrice,
    int? maxPrice,
  }) async {
    await I18nStore.instance.ensureLoaded();
    var results = MockData.properties.where((item) => item.citySlug == citySlug).toList();
    if (type != null && type.isNotEmpty && type != 'all') {
      results = results.where((item) => item.type == type).toList();
    }
    if (query != null && query.trim().isNotEmpty) {
      final searchKeys = _buildSearchKeys(results);
      results = results.where((item) {
        final key = searchKeys[item.id] ?? '';
        return matchesQuery(key, query);
      }).toList();
    }
    if (minPrice != null) {
      results = results.where((item) => item.price >= minPrice).toList();
    }
    if (maxPrice != null) {
      results = results.where((item) => item.price <= maxPrice).toList();
    }
    if (sort == 'price_low') {
      results.sort((a, b) => a.price.compareTo(b.price));
    } else if (sort == 'price_high') {
      results.sort((a, b) => b.price.compareTo(a.price));
    }
    return results;
  }

  Map<String, String> _buildSearchKeys(List<Property> items) {
    final map = <String, String>{};
    for (final item in items) {
      final english = '${item.title} ${item.area} ${item.citySlug} ${item.type}';
      map[item.id] = buildSearchKey(
        englishText: english,
        citySlug: item.citySlug,
        propertyType: item.type,
        localityText: item.area,
      );
    }
    return map;
  }
}
