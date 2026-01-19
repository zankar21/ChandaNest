import 'package:dio/dio.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required this.dio,
    required this.tokenReader,
    required this.onUnauthorized,
  });

  final Dio dio;
  final Future<String?> Function({bool forceRefresh}) tokenReader;
  final Future<void> Function()? onUnauthorized;

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final path = options.uri.path;
    final isPublic = path.startsWith('/v1/public');
    if (!isPublic) {
      final token = await tokenReader(forceRefresh: false);
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final statusCode = err.response?.statusCode;
    final options = err.requestOptions;
    final path = options.uri.path;
    final isPublic = path.startsWith('/v1/public');
    if (!isPublic && statusCode == 401 && options.extra['retried'] != true) {
      final refreshed = await tokenReader(forceRefresh: true);
      if (refreshed != null && refreshed.isNotEmpty) {
        final requestOptions = options.copyWith(
          headers: {...options.headers, 'Authorization': 'Bearer $refreshed'},
          extra: {...options.extra, 'retried': true},
        );
        try {
          final response = await dio.fetch<dynamic>(requestOptions);
          return handler.resolve(response);
        } catch (_) {}
      }
    }
    if (statusCode == 401 && onUnauthorized != null) {
      await onUnauthorized!.call();
    }
    handler.next(err);
  }
}
