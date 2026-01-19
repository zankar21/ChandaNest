import 'dart:async';
import '../config/constants.dart';
import 'api_client.dart';

class MediaSigner {
  MediaSigner(this._api);

  final ApiClient _api;
  final Map<String, _CacheItem> _cache = {};

  Future<Map<String, String>> signPaths(List<String> paths) async {
    final now = DateTime.now();
    final result = <String, String>{};
    final toFetch = <String>[];
    for (final path in paths) {
      final cached = _cache[path];
      if (cached != null && cached.expiresAt.isAfter(now)) {
        result[path] = cached.url;
      } else {
        toFetch.add(path);
      }
    }
    if (toFetch.isEmpty) {
      return result;
    }
    final payload = await _api.post(
      '${AppConstants.publicBasePath}/media/sign-get',
      data: {'paths': toFetch},
    );
    final items = _api.unwrapOkData<List<_SignedItem>>(payload, (data) {
      final list = data?['items'] as List<dynamic>? ?? <dynamic>[];
      return list.map((item) => _SignedItem.fromJson(item as Map<String, dynamic>)).toList();
    });
    for (final item in items) {
      result[item.objectPath] = item.url;
      _cache[item.objectPath] = _CacheItem(url: item.url, expiresAt: item.expiresAt);
    }
    return result;
  }
}

class _CacheItem {
  _CacheItem({required this.url, required this.expiresAt});

  final String url;
  final DateTime expiresAt;
}

class _SignedItem {
  _SignedItem({required this.objectPath, required this.url, required this.expiresAt});

  final String objectPath;
  final String url;
  final DateTime expiresAt;

  factory _SignedItem.fromJson(Map<String, dynamic> json) {
    final expiresAt = DateTime.tryParse(json['expiresAt']?.toString() ?? '');
    return _SignedItem(
      objectPath: (json['objectPath'] ?? '') as String,
      url: (json['url'] ?? '') as String,
      expiresAt: expiresAt ?? DateTime.now().add(const Duration(minutes: 5)),
    );
  }
}
