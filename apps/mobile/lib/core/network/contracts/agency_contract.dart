abstract class AgencyRepositoryContract {
  Future<Map<String, int>> getDashboard();
  Future<List<Map<String, dynamic>>> listAgents();
  Future<List<Map<String, dynamic>>> listOrgListings();
  Future<List<Map<String, dynamic>>> listLeads();
}
