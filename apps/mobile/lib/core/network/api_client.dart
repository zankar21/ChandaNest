import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/env.dart';
import 'errors.dart';
import 'interceptors.dart';
import 'app_check_interceptor.dart';
import '../../features/owner_auth/state/auth_session_provider.dart';

class ApiClient {
  ApiClient(this._dio);

  final Dio _dio;

  Future<dynamic> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParameters);
      return response.data;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Response<dynamic>> getRaw(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.get(path, queryParameters: queryParameters);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<dynamic> post(String path, {Map<String, dynamic>? data}) async {
    try {
      final response = await _dio.post(path, data: data);
      return response.data;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Response<dynamic>> postRaw(String path, {Map<String, dynamic>? data}) async {
    try {
      return await _dio.post(path, data: data);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<dynamic> patch(String path, {Map<String, dynamic>? data}) async {
    try {
      final response = await _dio.patch(path, data: data);
      return response.data;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  T unwrapOkData<T>(dynamic payload, T Function(dynamic data) mapper) {
    if (payload is Map<String, dynamic>) {
      final ok = payload['ok'];
      if (ok == true) {
        return mapper(payload['data']);
      }
      if (ok == false) {
        final message = payload['error']?['message']?.toString() ?? 'Request failed';
        throw ApiException(message);
      }
    }
    throw ApiException('Invalid response');
  }
}

final apiClientProvider = Provider<ApiClient>((ref) {
  final authSession = ref.read(authSessionProvider.notifier);
  final dio = Dio(
    BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
    ),
  );

  dio.interceptors.add(AppCheckInterceptor());
  dio.interceptors.add(
    AuthInterceptor(
      dio: dio,
      tokenReader: authSession.getIdToken,
      onUnauthorized: () async {
        await authSession.logout();
      },
    ),
  );
  return ApiClient(dio);
});
