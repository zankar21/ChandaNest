import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class ApiErrorLog {
  ApiErrorLog({
    required this.method,
    required this.path,
    required this.statusCode,
    required this.requestId,
    required this.message,
  });

  final String method;
  final String path;
  final int? statusCode;
  final String? requestId;
  final String message;
}

class ApiLog {
  static final ValueNotifier<ApiErrorLog?> lastError = ValueNotifier<ApiErrorLog?>(null);

  static void record(DioException error, String message) {
    final options = error.requestOptions;
    final method = options.method.toUpperCase();
    final path = options.uri.path;
    final statusCode = error.response?.statusCode;
    final requestId = _requestIdFromHeaders(error.response?.headers);
    lastError.value = ApiErrorLog(
      method: method,
      path: path,
      statusCode: statusCode,
      requestId: requestId,
      message: message,
    );
    if (kDebugMode) {
      debugPrint(
        'API error: $method $path | status=${statusCode ?? 'unknown'} | requestId=${requestId ?? 'none'} | $message',
      );
    }
  }

  static String? _requestIdFromHeaders(Headers? headers) {
    if (headers == null) return null;
    return headers.value('x-request-id') ??
        headers.value('x-cloud-trace-context') ??
        headers.value('x-correlation-id');
  }
}
