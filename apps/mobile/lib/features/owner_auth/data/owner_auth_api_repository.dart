import '../../../core/network/api_client.dart';
import '../../../core/network/contracts/owner_auth_contract.dart';
import '../../../core/network/errors.dart';

class OwnerAuthRepositoryApi implements OwnerAuthRepositoryContract {
  OwnerAuthRepositoryApi(this._api);

  final ApiClient _api;

  @override
  Future<String> startOtp(String phone) async {
    throw ApiException('OTP handled by Firebase Auth client-side');
  }

  @override
  Future<String> verifyOtp({required String phone, required String otp, String? sessionId}) async {
    throw ApiException('OTP handled by Firebase Auth client-side');
  }

  @override
  Future<Map<String, dynamic>> getMe(String tenantId) async {
    final payload = await _api.get('/v1/tenants/$tenantId/me');
    return _api.unwrapOkData<Map<String, dynamic>>(payload, (data) {
      return data is Map<String, dynamic> ? data : <String, dynamic>{};
    });
  }
}
