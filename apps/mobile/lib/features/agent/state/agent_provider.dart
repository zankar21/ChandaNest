import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/env.dart';
import '../../../core/network/api_client.dart';
import '../../../core/auth/tenant_resolver.dart';
import '../../../core/network/contracts/agent_contract.dart';
import '../data/agent_repository.dart';

final agentRepositoryProvider = Provider<AgentRepositoryContract>((ref) {
  final api = ref.watch(apiClientProvider);
  final resolver = ref.watch(tenantResolverProvider);
  if (Env.useMockData) {
    return AgentRepositoryMock();
  }
  return AgentRepositoryApi(api, resolver);
});

final agentDashboardProvider = FutureProvider<Map<String, int>>((ref) async {
  final repo = ref.watch(agentRepositoryProvider);
  return repo.getDashboard();
});

final agentLeadsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final repo = ref.watch(agentRepositoryProvider);
  return repo.listLeads();
});

final agentListingsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final repo = ref.watch(agentRepositoryProvider);
  return repo.listListings();
});
