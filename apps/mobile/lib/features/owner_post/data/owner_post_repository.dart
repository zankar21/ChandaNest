import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/errors.dart';
import '../../../core/auth/tenant_resolver.dart';
import '../../../core/config/env.dart';

class OwnerPostRepository {
  OwnerPostRepository(this._api, this._tenantResolver);

  final ApiClient _api;
  final TenantResolver _tenantResolver;

  Future<Map<String, dynamic>> getListing(String listingId) async {
    final tenantId = await _requireTenantId();
    final payload = await _api.get('/v1/tenants/$tenantId/listings/$listingId');
    return _api.unwrapOkData<Map<String, dynamic>>(payload, (data) {
      return data is Map<String, dynamic> ? data : <String, dynamic>{};
    });
  }

  Future<String> createListing(Map<String, dynamic> body) async {
    final tenantId = await _requireTenantId();
    final payload = await _api.post('/v1/tenants/$tenantId/listings', data: body);
    return _api.unwrapOkData<String>(payload, (data) {
      return (data?['listingId'] ?? data?['id'] ?? '') as String;
    });
  }

  Future<void> updateListing(String listingId, Map<String, dynamic> body) async {
    final tenantId = await _requireTenantId();
    await _api.patch('/v1/tenants/$tenantId/listings/$listingId', data: body);
  }

  Future<MediaUploadResult> uploadMedia(String listingId, XFile file) async {
    final tenantId = await _requireTenantId();
    final ext = _extensionForPath(file.path);
    final contentType = _contentTypeForPath(file.path);
    final safeName = _sanitizeFileName(_stripExtension(file.name));
    final objectPath =
        'tenants/$tenantId/listings/$listingId/media/gallery-${DateTime.now().millisecondsSinceEpoch}-$safeName.$ext';
    final payload = await _api.post('/v1/media/sign-put', data: {
      'objectPath': objectPath,
      'contentType': contentType,
    });
    final signed = _api.unwrapOkData<Map<String, dynamic>>(payload, (data) {
      return data is Map<String, dynamic> ? data : <String, dynamic>{};
    });
    final url = signed['url']?.toString() ?? '';
    if (url.isEmpty) {
      throw ApiException('Upload URL missing.');
    }
    final bytes = await file.readAsBytes();
    final dio = Dio();
    await dio.put<void>(
      url,
      data: bytes,
      options: Options(headers: {'Content-Type': contentType}),
    );
    return MediaUploadResult(objectPath: objectPath, contentType: contentType);
  }

  Future<void> patchListingMedia(String listingId, List<String> objectPaths, {String? heroPath}) async {
    final tenantId = await _requireTenantId();
    if (objectPaths.isEmpty) return;
    final selectedHero = heroPath != null && objectPaths.contains(heroPath) ? heroPath : objectPaths.first;
    final hero = {'objectPath': selectedHero};
    final gallery = objectPaths.map((path) => {'objectPath': path}).toList();
    await _api.patch('/v1/tenants/$tenantId/listings/$listingId', data: {
      'media': {'hero': hero, 'gallery': gallery},
    });
  }

  Future<String> _requireTenantId() async {
    if (Env.useMockData) {
      if (Env.tenantId.isNotEmpty) return Env.tenantId;
    }
    final tenantId = await _tenantResolver.resolveTenantId();
    if (tenantId == null || tenantId.isEmpty) {
      throw ApiException('TenantId not found for this account.');
    }
    return tenantId;
  }

  String _extensionForPath(String path) {
    final parts = path.split('.');
    if (parts.length < 2) return 'jpg';
    final ext = parts.last.toLowerCase();
    if (ext.isEmpty) return 'jpg';
    return ext;
  }

  String _contentTypeForPath(String path) {
    final ext = _extensionForPath(path);
    switch (ext) {
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      default:
        return 'image/jpeg';
    }
  }

  String _sanitizeFileName(String name) {
    return name.replaceAll(RegExp(r'[^A-Za-z0-9._-]+'), '-');
  }

  String _stripExtension(String name) {
    final index = name.lastIndexOf('.');
    if (index <= 0) return name;
    return name.substring(0, index);
  }
}

class MediaUploadResult {
  MediaUploadResult({required this.objectPath, required this.contentType});

  final String objectPath;
  final String contentType;
}
