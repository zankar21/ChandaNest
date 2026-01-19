import '../../../core/config/constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/contracts/explore_contract.dart';
import '../../../core/network/media_signer.dart';
import '../../../core/i18n/i18n_store.dart';
import '../../../core/i18n/search_keys.dart';
import '../../../shared/models/property.dart';

class ExploreRepositoryApi implements ExploreRepositoryContract {
  ExploreRepositoryApi(this._api, this._signer);

  final ApiClient _api;
  final MediaSigner _signer;

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
    final params = <String, dynamic>{
      'citySlug': citySlug,
      if (type != null && type.isNotEmpty && type != 'all' && type != 'rent') 'propertyType': type,
      if (type == 'rent') 'type': 'rent',
      'limit': 100,
    };
    final payload = await _api.get('${AppConstants.publicBasePath}/properties', queryParameters: params);
    final items = _api.unwrapOkData<List<Property>>(payload, (data) {
      final list = data?['items'] as List<dynamic>? ?? <dynamic>[];
      return list.map((item) => _parseProperty(item as Map<String, dynamic>)).toList();
    });
    final searchKeys = _buildSearchKeys(items);
    final filtered = _applyClientFilters(
      items,
      searchKeys: searchKeys,
      query: query,
      sort: sort,
      minPrice: minPrice,
      maxPrice: maxPrice,
    );
    final paths = filtered.map((p) => p.coverUrl).whereType<String>().toList();
    final signed = await _signer.signPaths(paths);
    return filtered
        .map((p) => p.coverUrl != null ? p.copyWith(coverUrl: signed[p.coverUrl!] ?? p.coverUrl) : p)
        .toList();
  }

  Property _parseProperty(Map<String, dynamic> json) {
    final location = json['location'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final geo = location['geo'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final media = json['media'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final hero = media['hero'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final cover = media['cover'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final pricing = json['pricing'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final description = json['description'];
    final type = (json['propertyType'] ?? json['type'] ?? 'land') as String;
    final listingType = (json['type'] ?? 'sale') as String;
    final price = _primaryPrice(pricing, listingType);
    return Property(
      id: (json['id'] ?? '') as String,
      title: (json['title'] ?? 'Untitled') as String,
      type: type,
      price: price,
      area: (location['locality'] ?? location['addressLine'] ?? '') as String,
      citySlug: (location['citySlug'] ?? '') as String,
      coverUrl: (hero['objectPath'] ?? cover['objectPath']) as String?,
      lat: (geo['lat'] as num?)?.toDouble(),
      lng: (geo['lng'] as num?)?.toDouble(),
      badges: (json['badges'] as List<dynamic>? ?? []).map((e) => e.toString()).toList(),
      description: _descriptionText(description),
      attrs: {
        ...(json['attrs'] as Map<String, dynamic>? ?? {}),
        'updatedAt': json['updatedAt'],
        'listingType': listingType,
      },
    );
  }

  int _primaryPrice(Map<String, dynamic> pricing, String listingType) {
    if (listingType == 'rent') {
      return (pricing['rentPerMonth'] as num?)?.round() ?? 0;
    }
    return (pricing['totalPrice'] as num?)?.round() ??
        (pricing['pricePerSqFt'] as num?)?.round() ??
        (pricing['rate'] as num?)?.round() ??
        0;
  }

  List<Property> _applyClientFilters(
    List<Property> items, {
    required Map<String, String> searchKeys,
    String? query,
    String? sort,
    int? minPrice,
    int? maxPrice,
  }) {
    var results = items;
    if (query != null && query.trim().isNotEmpty) {
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
    if (sort == 'recent' || sort == null || sort.isEmpty) {
      results.sort((a, b) => _updatedAt(b).compareTo(_updatedAt(a)));
    } else if (sort == 'price_low') {
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

  DateTime _updatedAt(Property property) {
    final raw = property.attrs['updatedAt'];
    final parsed = _parseUpdatedAt(raw);
    return parsed ?? DateTime.fromMillisecondsSinceEpoch(0);
  }

  DateTime? _parseUpdatedAt(dynamic raw) {
    if (raw is String) {
      return DateTime.tryParse(raw);
    }
    if (raw is Map<String, dynamic>) {
      final seconds = raw['seconds'] ?? raw['_seconds'];
      final nanos = raw['nanoseconds'] ?? raw['_nanoseconds'];
      if (seconds is int && nanos is int) {
        return DateTime.fromMillisecondsSinceEpoch((seconds * 1000) + (nanos ~/ 1000000));
      }
      if (seconds is num) {
        return DateTime.fromMillisecondsSinceEpoch((seconds * 1000).round());
      }
    }
    return null;
  }

  String _descriptionText(dynamic description) {
    if (description is String) return description;
    if (description is Map<String, dynamic>) {
      final active = description['active'];
      if (active == 'ai' && description['ai'] is String) return description['ai'] as String;
      if (active == 'user' && description['user'] is String) return description['user'] as String;
      if (description['user'] is String) return description['user'] as String;
      if (description['ai'] is String) return description['ai'] as String;
    }
    return '';
  }
}
