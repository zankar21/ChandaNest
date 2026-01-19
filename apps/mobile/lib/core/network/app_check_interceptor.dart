import 'package:dio/dio.dart';
import 'package:firebase_app_check/firebase_app_check.dart';

class AppCheckInterceptor extends Interceptor {
  AppCheckInterceptor();

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final method = options.method.toUpperCase();
    final isWrite = method != 'GET' && method != 'HEAD';
    final isPublic = options.uri.path.startsWith('/v1/public');
    if (!isWrite || isPublic) {
      handler.next(options);
      return;
    }
    try {
      final token = await FirebaseAppCheck.instance.getToken();
      if (token != null && token.isNotEmpty) {
        options.headers['X-Firebase-AppCheck'] = token;
      }
    } catch (_) {}
    handler.next(options);
  }
}
