import '../../../shared/models/lead.dart';

abstract class OwnerLeadsRepositoryContract {
  Future<List<Lead>> getLeads();
}
