import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/env.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/contracts/leads_contract.dart';
import '../data/enquiry_api_repository.dart';
import '../data/enquiry_repository.dart';

final enquiryRepositoryProvider = Provider<EnquiryRepositoryContract>((ref) {
  final api = ref.watch(apiClientProvider);
  if (Env.useMockData) {
    return EnquiryRepositoryMock();
  }
  return EnquiryRepositoryApi(api);
});

final enquiryProvider = StateNotifierProvider<EnquiryNotifier, AsyncValue<String?>>((ref) {
  return EnquiryNotifier(ref.read(enquiryRepositoryProvider));
});

class EnquiryNotifier extends StateNotifier<AsyncValue<String?>> {
  EnquiryNotifier(this._repo) : super(const AsyncValue.data(null));

  final EnquiryRepositoryContract _repo;

  Future<void> submit({
    required String propertyId,
    required String name,
    required String phone,
    required String message,
    String? email,
    String? subjectTitle,
    String? subjectCity,
    String? subjectArea,
    String? subjectHref,
  }) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _repo.submit(
          propertyId: propertyId,
          name: name,
          phone: phone,
          message: message,
          email: email,
          subjectTitle: subjectTitle,
          subjectCity: subjectCity,
          subjectArea: subjectArea,
          subjectHref: subjectHref,
        ));
  }
}
