import '../../../core/network/contracts/owner_auth_contract.dart';

class OwnerAuthRepositoryMock implements OwnerAuthRepositoryContract {
  @override
  Future<String> startOtp(String phone) async {
    return 'mock-session';
  }

  @override
  Future<String> verifyOtp({required String phone, required String otp, String? sessionId}) async {
    return 'mock-token';
  }

  @override
  Future<Map<String, dynamic>> getMe(String tenantId) async {
    return {'name': 'Owner'};
  }
}
