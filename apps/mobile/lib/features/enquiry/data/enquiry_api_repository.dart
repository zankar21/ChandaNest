import '../../../core/config/constants.dart';
import '../../../core/config/env.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/contracts/leads_contract.dart';

class EnquiryRepositoryApi implements EnquiryRepositoryContract {
  EnquiryRepositoryApi(this._api);

  final ApiClient _api;

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
    final response = await _api.postRaw(
      '${AppConstants.publicBasePath}/leads',
      data: {
        'tenantId': Env.tenantId,
        'subject': {
          'kind': 'property',
          'propertyId': propertyId,
          if (subjectTitle != null && subjectTitle.isNotEmpty) 'title': subjectTitle,
          if (subjectHref != null && subjectHref.isNotEmpty) 'href': subjectHref,
          if (subjectCity != null && subjectCity.isNotEmpty) 'city': subjectCity,
          if (subjectArea != null && subjectArea.isNotEmpty) 'area': subjectArea,
        },
        'contact': {
          'name': name,
          'phone': phone,
          if (email != null && email.isNotEmpty) 'email': email,
          'message': message,
        },
        'source': {'page': 'property'},
      },
    );
    if (response.statusCode == 204) {
      return '';
    }
    final payload = response.data;
    return _api.unwrapOkData<String>(payload, (data) {
      return (data?['leadId'] ?? '') as String;
    });
  }
}
