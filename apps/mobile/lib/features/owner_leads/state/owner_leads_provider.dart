import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/env.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/contracts/owner_leads_contract.dart';
import '../../../shared/models/lead.dart';
import '../data/owner_leads_api_repository.dart';
import '../data/owner_leads_repository.dart';

final ownerLeadsRepositoryProvider = Provider<OwnerLeadsRepositoryContract>((ref) {
  final api = ref.watch(apiClientProvider);
  if (Env.useMockData) {
    return OwnerLeadsRepositoryMock();
  }
  return OwnerLeadsRepositoryApi(api);
});

final ownerLeadsProvider = AsyncNotifierProvider<OwnerLeadsNotifier, List<Lead>>(OwnerLeadsNotifier.new);

class OwnerLeadsNotifier extends AsyncNotifier<List<Lead>> {
  late final OwnerLeadsRepositoryContract _repo;

  @override
  Future<List<Lead>> build() async {
    _repo = ref.read(ownerLeadsRepositoryProvider);
    return _repo.getLeads();
  }
}
