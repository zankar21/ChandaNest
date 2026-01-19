import '../../../core/config/constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/contracts/map_contract.dart';
import '../../../core/network/media_signer.dart';
import '../../../shared/models/property.dart';
import '../../../shared/models/property_pin.dart';

class MapRepositoryApi implements MapRepositoryContract {
  MapRepositoryApi(this._api, this._signer);

  final ApiClient _api;
  final MediaSigner _signer;

  @override
  Future<List<Property>> getProperties(String citySlug) async {
    final payload = await _api.get(
      '${AppConstants.publicBasePath}/properties',
      queryParameters: {'citySlug': citySlug, 'limit': 200},
    );
    final items = _api.unwrapOkData<List<Property>>(payload, (data) {
      final list = data?['items'] as List<dynamic>? ?? <dynamic>[];
      return list.map((item) => _parseProperty(item as Map<String, dynamic>)).toList();
    });
    final paths = items.map((p) => p.coverUrl).whereType<String>().toList();
    final signed = await _signer.signPaths(paths);
    return items
        .map((p) => p.coverUrl != null ? p.copyWith(coverUrl: signed[p.coverUrl!] ?? p.coverUrl) : p)
        .toList();
  }

  @override
  Future<List<PropertyPin>> getPins(String citySlug) async {
    final properties = await getProperties(citySlug);
    return properties
        .where((item) => item.lat != null && item.lng != null)
        .map((item) => PropertyPin(
              id: item.id,
              lat: item.lat ?? 0,
              lng: item.lng ?? 0,
              price: item.price,
              type: item.type,
            ))
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
    return Property(
      id: (json['id'] ?? '') as String,
      title: (json['title'] ?? 'Untitled') as String,
      type: type,
      price: (pricing['rate'] as num?)?.round() ?? 0,
      area: (location['locality'] ?? location['addressLine'] ?? '') as String,
      citySlug: (location['citySlug'] ?? '') as String,
      coverUrl: (hero['objectPath'] ?? cover['objectPath']) as String?,
      lat: (geo['lat'] as num?)?.toDouble(),
      lng: (geo['lng'] as num?)?.toDouble(),
      badges: (json['badges'] as List<dynamic>? ?? []).map((e) => e.toString()).toList(),
      description: _descriptionText(description),
      attrs: (json['attrs'] as Map<String, dynamic>? ?? {}),
    );
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
