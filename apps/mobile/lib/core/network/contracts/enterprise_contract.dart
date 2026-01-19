abstract class EnterpriseRepositoryContract {
  Future<Map<String, int>> getDashboard();
  Future<List<Map<String, dynamic>>> listProjects();
  Future<List<Map<String, dynamic>>> listInventory();
  Future<List<Map<String, dynamic>>> listLeads();
}
