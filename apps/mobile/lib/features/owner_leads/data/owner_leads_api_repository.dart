import '../../../core/network/api_client.dart';
import '../../../core/network/contracts/owner_leads_contract.dart';
import '../../../core/network/errors.dart';
import '../../../shared/models/lead.dart';

class OwnerLeadsRepositoryApi implements OwnerLeadsRepositoryContract {
  OwnerLeadsRepositoryApi(this._api);

  final ApiClient _api;

  @override
  Future<List<Lead>> getLeads() async {
    _api.hashCode;
    throw ApiException('Owner leads endpoint not available for non-admin role.');
  }

}
