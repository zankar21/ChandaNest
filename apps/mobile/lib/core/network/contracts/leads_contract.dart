abstract class EnquiryRepositoryContract {
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
  });
}
