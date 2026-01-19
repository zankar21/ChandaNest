import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/env.dart';
import '../../../core/network/api_client.dart';
import '../../../core/auth/tenant_resolver.dart';
import '../../../core/network/contracts/agency_contract.dart';
import '../data/agency_repository.dart';

final agencyRepositoryProvider = Provider<AgencyRepositoryContract>((ref) {
  final api = ref.watch(apiClientProvider);
  final resolver = ref.watch(tenantResolverProvider);
  if (Env.useMockData) {
    return AgencyRepositoryMock();
  }
  return AgencyRepositoryApi(api, resolver);
});

final agencyDashboardProvider = FutureProvider<Map<String, int>>((ref) async {
  final repo = ref.watch(agencyRepositoryProvider);
  return repo.getDashboard();
});
