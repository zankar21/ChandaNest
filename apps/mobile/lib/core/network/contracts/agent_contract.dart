abstract class AgentRepositoryContract {
  Future<Map<String, int>> getDashboard();
  Future<List<Map<String, dynamic>>> listLeads();
  Future<List<Map<String, dynamic>>> listListings();
}
