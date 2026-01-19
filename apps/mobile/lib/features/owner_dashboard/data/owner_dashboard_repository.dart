class OwnerDashboardRepository {
  Future<Map<String, int>> loadSummary() async {
    return {'listings': 3, 'leads': 2};
  }
}
