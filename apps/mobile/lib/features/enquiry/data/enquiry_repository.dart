import '../../../core/network/contracts/leads_contract.dart';

class EnquiryRepositoryMock implements EnquiryRepositoryContract {
  @override
  Future<String> submit({
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
    return 'lead_${DateTime.now().millisecondsSinceEpoch}';
  }
}
