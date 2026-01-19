import '../../../core/network/api_client.dart';
import '../../../core/network/contracts/owner_listings_contract.dart';
import '../../../core/network/private_media_signer.dart';
import '../../../core/network/errors.dart';
import '../../../core/auth/tenant_resolver.dart';
import '../../../shared/models/property.dart';

class OwnerListingsRepositoryApi implements OwnerListingsRepositoryContract {
  OwnerListingsRepositoryApi(this._api, this._signer, this._tenantResolver);

  final ApiClient _api;
  final PrivateMediaSigner _signer;
  final TenantResolver _tenantResolver;

  @override
  Future<List<Property>> getListings() async {
    final tenantId = await _requireTenantId();
    final payload = await _api.get('/v1/tenants/$tenantId/listings', queryParameters: {'mine': '1'});
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
  Future<void> submit(String listingId) async {
    final tenantId = await _requireTenantId();
    await _api.post('/v1/tenants/$tenantId/listings/$listingId/submit');
  }

  @override
  Future<void> publish(String listingId) async {
    final tenantId = await _requireTenantId();
    await _api.post('/v1/tenants/$tenantId/listings/$listingId/publish');
  }

  @override
  Future<void> unpublish(String listingId) async {
    final tenantId = await _requireTenantId();
    await _api.post('/v1/tenants/$tenantId/listings/$listingId/unpublish');
  }

  Future<String> _requireTenantId() async {
    final tenantId = await _tenantResolver.resolveTenantId();
    if (tenantId == null || tenantId.isEmpty) {
      throw ApiException('TenantId not found for this account.');
    }
    return tenantId;
  }

  Property _parseProperty(Map<String, dynamic> json) {
    final location = json['location'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final geo = location['geo'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final media = json['media'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final hero = media['hero'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final pricing = json['pricing'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final visibilityState = json['visibility'] ?? json['status'];
    final listingStatus = json['listingStatus'] ?? json['status'];
    final listingType = (json['type'] ?? 'sale') as String;
    final type = (json['propertyType'] ?? json['type'] ?? 'land') as String;
    final description = json['description'];
    final price = _primaryPrice(pricing, listingType);
    return Property(
      id: (json['id'] ?? '') as String,
      title: (json['title'] ?? 'Untitled') as String,
      type: type,
      price: price,
      area: (location['locality'] ?? location['addressLine'] ?? '') as String,
      citySlug: (location['citySlug'] ?? '') as String,
      coverUrl: hero['objectPath'] as String?,
      lat: (geo['lat'] as num?)?.toDouble(),
      lng: (geo['lng'] as num?)?.toDouble(),
      badges: (json['badges'] as List<dynamic>? ?? []).map((e) => e.toString()).toList(),
      description: _descriptionText(description),
      attrs: {
        ...(json['attrs'] as Map<String, dynamic>? ?? {}),
        if (visibilityState != null) 'visibility': visibilityState,
        if (listingStatus != null) 'listingStatus': listingStatus,
        'listingType': listingType,
        if (json['updatedAt'] != null) 'updatedAt': json['updatedAt'],
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
