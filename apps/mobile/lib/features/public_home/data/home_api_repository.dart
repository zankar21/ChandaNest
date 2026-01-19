import '../../../core/config/constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/contracts/home_contract.dart';
import '../../../core/network/media_signer.dart';
import '../../../shared/models/home_payload.dart';
import '../../../shared/models/property.dart';
import '../../../shared/models/project.dart';

class HomeRepositoryApi implements HomeRepositoryContract {
  HomeRepositoryApi(this._api, this._signer);

  final ApiClient _api;
  final MediaSigner _signer;

  @override
  Future<HomePayload> getHome(String citySlug) async {
    final propertiesPayload = await _api.get(
      '${AppConstants.publicBasePath}/properties',
      queryParameters: {'citySlug': citySlug, 'limit': 6},
    );
    final properties = _api.unwrapOkData<List<Property>>(propertiesPayload, (data) {
      final list = data?['items'] as List<dynamic>? ?? <dynamic>[];
      return list.map((item) => _parseProperty(item as Map<String, dynamic>)).toList();
    });

    final cityName = AppConstants.cityNameForSlug(citySlug);
    final projectsPayload = await _api.get(
      '${AppConstants.publicBasePath}/projects',
      queryParameters: {'city': cityName, 'limit': 4},
    );
    final projects = _api.unwrapOkData<List<Project>>(projectsPayload, (data) {
      final list = data?['items'] as List<dynamic>? ?? <dynamic>[];
      return list.map((item) => _parseProject(item as Map<String, dynamic>)).toList();
    });

    final propertyPaths = properties.map((p) => p.coverUrl).whereType<String>().toList();
    final projectPaths = projects.map((p) => p.coverUrl).whereType<String>().toList();
    final signed = await _signer.signPaths([...propertyPaths, ...projectPaths]);
    final signedProperties = properties
        .map((p) => p.coverUrl != null ? p.copyWith(coverUrl: signed[p.coverUrl!] ?? p.coverUrl) : p)
        .toList();
    final signedProjects = projects
        .map((p) => p.coverUrl != null ? p.copyWith(coverUrl: signed[p.coverUrl!] ?? p.coverUrl) : p)
        .toList();

    return HomePayload(featuredProperties: signedProperties, featuredProjects: signedProjects);
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
        'listingType': listingType,
      },
    );
  }

  Project _parseProject(Map<String, dynamic> json) {
    final location = json['location'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final priceRange = json['priceRange'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final media = json['media'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final cover = media['cover'] as Map<String, dynamic>? ?? <String, dynamic>{};
    return Project(
      id: (json['id'] ?? '') as String,
      name: (json['name'] ?? 'Project') as String,
      area: (location['area'] ?? '') as String,
      status: (json['status'] ?? 'planning') as String,
      minPrice: (priceRange['min'] as num?)?.round() ?? 0,
      coverUrl: cover['objectPath'] as String?,
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

  int _primaryPrice(Map<String, dynamic> pricing, String listingType) {
    if (listingType == 'rent') {
      return (pricing['rentPerMonth'] as num?)?.round() ?? 0;
    }
    return (pricing['totalPrice'] as num?)?.round() ??
        (pricing['pricePerSqFt'] as num?)?.round() ??
        (pricing['rate'] as num?)?.round() ??
        0;
  }
}
