import '../../../core/config/constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/contracts/details_contract.dart';
import '../../../core/network/media_signer.dart';
import '../../../shared/models/property.dart';

class PropertyDetailsRepositoryApi implements PropertyDetailsRepositoryContract {
  PropertyDetailsRepositoryApi(this._api, this._signer);

  final ApiClient _api;
  final MediaSigner _signer;

  @override
  Future<Property> getDetails(String propertyId) async {
    final payload = await _api.get('${AppConstants.publicBasePath}/properties/$propertyId');
    final property = _api.unwrapOkData<Property>(payload, (data) {
      final map = data is Map<String, dynamic> ? data : <String, dynamic>{};
      return _parseProperty(map, propertyId);
    });
    final galleryPaths = _galleryPaths(property.attrs);
    final imagePaths = <String>{
      if (property.coverUrl != null && property.coverUrl!.isNotEmpty) property.coverUrl!,
      ...galleryPaths,
    }.toList();
    if (imagePaths.isEmpty) {
      return property;
    }
    final signed = await _signer.signPaths(imagePaths);
    final signedGallery = galleryPaths.map((path) => signed[path] ?? path).toList();
    final signedCover = property.coverUrl != null ? signed[property.coverUrl!] ?? property.coverUrl : null;
    return property.copyWith(
      coverUrl: signedCover,
      attrs: {
        ...property.attrs,
        'gallery': signedGallery,
      },
    );
  }

  Property _parseProperty(Map<String, dynamic> json, String fallbackId) {
    final location = json['location'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final geo = location['geo'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final media = json['media'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final hero = media['hero'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final cover = media['cover'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final gallery = media['gallery'] as List<dynamic>? ?? <dynamic>[];
    final pricing = json['pricing'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final description = json['description'];
    final type = (json['propertyType'] ?? json['type'] ?? 'land') as String;
    final listingType = (json['type'] ?? 'sale') as String;
    final price = _primaryPrice(pricing, listingType);
    final galleryPaths = gallery.map(_objectPathFromItem).whereType<String>().toList();
    return Property(
      id: (json['id'] ?? fallbackId) as String,
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
        if (galleryPaths.isNotEmpty) 'gallery': galleryPaths,
        'listingType': listingType,
      },
    );
  }

  List<String> _galleryPaths(Map<String, dynamic> attrs) {
    final items = attrs['gallery'];
    if (items is List<dynamic>) {
      return items.map((item) => item.toString()).where((item) => item.isNotEmpty).toList();
    }
    return <String>[];
  }

  String? _objectPathFromItem(dynamic item) {
    if (item is String) return item;
    if (item is Map<String, dynamic>) {
      final path = item['objectPath'] ?? item['path'];
      if (path is String) return path;
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
