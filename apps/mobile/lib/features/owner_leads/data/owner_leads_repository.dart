import '../../../core/network/contracts/owner_leads_contract.dart';
import '../../../shared/models/lead.dart';
import '../../../shared/models/mock_data.dart';

class OwnerLeadsRepositoryMock implements OwnerLeadsRepositoryContract {
  @override
  Future<List<Lead>> getLeads() async {
    return MockData.leads;
  }
}
