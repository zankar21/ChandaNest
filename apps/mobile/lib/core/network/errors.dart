import 'package:dio/dio.dart';
import 'api_log.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => 'ApiException($statusCode): $message';
}

ApiException mapDioException(DioException error) {
  final statusCode = error.response?.statusCode;
  final message = error.response?.statusMessage ?? error.message ?? 'Unknown error';
  ApiLog.record(error, message);
  return ApiException(message, statusCode: statusCode);
}
