abstract class OwnerAuthRepositoryContract {
  Future<String> startOtp(String phone);
  Future<String> verifyOtp({required String phone, required String otp, String? sessionId});
  Future<Map<String, dynamic>> getMe(String tenantId);
}
